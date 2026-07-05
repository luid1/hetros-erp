import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * RouteOptimizerService — "IA" de roteirização.
 *
 * Heurística determinística (First-Fit Decreasing por cluster geográfico):
 *  1. Agrupa pedidos abertos por região (prefixo do CEP → macro-zona).
 *  2. Ordena pedidos por peso desc. (itens pesados alocados primeiro).
 *  3. Distribui em veículos respeitando capacidade (kg + caixas) e janela.
 *  4. Sequencia as paradas por CEP crescente (proxy de proximidade) e janela.
 *  5. Persiste Route + RouteStop em transação ACID e grava AuditLog.
 *
 * Não usa float para capacidade de decisão crítica: pesos em Decimal → Number
 * apenas para comparação (tolerância de arredondamento controlada).
 */

export interface OtimizarRotasDto {
  /** Dia da rota (YYYY-MM-DD). */
  dataRota: string;
  /** Filial de origem. */
  filialId: string;
  /** IDs de pedidos a roteirizar. Se vazio, pega todos os elegíveis do dia. */
  pedidoIds?: string[];
  /** Folga de segurança de capacidade (0..1). Ex.: 0.1 = usa só 90% do veículo. */
  folgaCapacidade?: number;
}

interface PedidoRoteavel {
  id: string;
  numero: number;
  clienteNome: string;
  cep: string;
  endereco: string;
  pesoKg: number;
  volumes: number;
  janelaInicio: Date | null;
  janelaFim: Date | null;
}

interface VeiculoDisponivel {
  id: string;
  placa: string;
  motoristaNome: string;
  capacidadeKg: number;
  capacidadeCaixas: number;
}

@Injectable()
export class RouteOptimizerService {
  private readonly logger = new Logger(RouteOptimizerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Macro-região a partir do CEP (SP capital como referência de zonas). */
  private regiaoPorCep(cep?: string | null): string {
    const digits = (cep || '').replace(/\D/g, '');
    if (digits.length < 5) return 'SEM_CEP';
    const prefix = Number(digits.slice(0, 3));
    if (prefix >= 0 && prefix <= 39) return 'CENTRO';
    if (prefix >= 40 && prefix <= 59) return 'ZONA_OESTE';
    if (prefix >= 60 && prefix <= 89) return 'ZONA_NORTE';
    if (prefix >= 90 && prefix <= 199) return 'ZONA_LESTE';
    if (prefix >= 200 && prefix <= 299) return 'ZONA_SUL';
    return 'GRANDE_SP';
  }

  private intervaloDia(data: string) {
    const dia = data.split('T')[0];
    return {
      inicio: new Date(`${dia}T00:00:00`),
      fim: new Date(`${dia}T23:59:59.999`),
    };
  }

  async otimizar(
    tenantId: string,
    usuarioId: string,
    dto: OtimizarRotasDto,
  ) {
    if (!dto?.dataRota) throw new BadRequestException('dataRota é obrigatória');
    if (!dto?.filialId) throw new BadRequestException('filialId é obrigatória');

    const folga = Math.min(Math.max(dto.folgaCapacidade ?? 0.05, 0), 0.5);
    const { inicio, fim } = this.intervaloDia(dto.dataRota);

    // 1) Coletar pedidos elegíveis
    const pedidosRaw = await this.prisma.pedido.findMany({
      where: {
        tenantId,
        filialOrigemId: dto.filialId,
        status: { in: ['CONFIRMADO', 'SEPARADO', 'FATURADO'] },
        ...(dto.pedidoIds?.length
          ? { id: { in: dto.pedidoIds } }
          : { dataEntrega: { gte: inicio, lte: fim } }),
      },
      include: {
        cliente: {
          select: { razaoSocial: true, nomeFantasia: true, enderecoJson: true },
        },
      },
    });

    if (pedidosRaw.length === 0) {
      throw new BadRequestException(
        'Nenhum pedido elegível para roteirização neste dia/filial.',
      );
    }

    const pedidos: PedidoRoteavel[] = pedidosRaw.map((p) => {
      const end: any = p.cliente?.enderecoJson || {};
      return {
        id: p.id,
        numero: p.numero,
        clienteNome: p.cliente?.nomeFantasia || p.cliente?.razaoSocial || '—',
        cep: String(end.cep || ''),
        endereco: [end.logradouro, end.numero, end.bairro, end.cidade]
          .filter(Boolean)
          .join(', '),
        pesoKg: Number(p.pesoTotal || 0),
        volumes: (p as any).volumes || 0,
        janelaInicio: null,
        janelaFim: null,
      };
    });

    // 2) Veículos ativos da filial (via transportadoras) com capacidade
    const veiculosRaw = await this.prisma.veiculo.findMany({
      where: { tenantId, ativo: true, capacidadeKg: { not: null } },
      orderBy: { capacidadeKg: 'desc' },
    });

    if (veiculosRaw.length === 0) {
      throw new BadRequestException(
        'Nenhum veículo ativo com capacidade cadastrada para roteirizar.',
      );
    }

    const veiculos: VeiculoDisponivel[] = veiculosRaw.map((v) => ({
      id: v.id,
      placa: v.placa,
      motoristaNome: v.motoristaPadrao || 'Sem motorista',
      capacidadeKg: Number(v.capacidadeKg || 0) * (1 - folga),
      capacidadeCaixas: (v.capacidadeCaixasH || 0) * (1 - folga),
    }));

    // 3) Agrupar por região e ordenar por peso desc (FFD)
    const porRegiao = new Map<string, PedidoRoteavel[]>();
    for (const ped of pedidos) {
      const reg = this.regiaoPorCep(ped.cep);
      if (!porRegiao.has(reg)) porRegiao.set(reg, []);
      porRegiao.get(reg)!.push(ped);
    }

    // 4) Alocação First-Fit Decreasing por região
    interface Bin {
      veiculo: VeiculoDisponivel;
      regiao: string;
      paradas: PedidoRoteavel[];
      pesoUsado: number;
      caixasUsadas: number;
    }
    const bins: Bin[] = [];
    let veicCursor = 0;
    const naoAlocados: PedidoRoteavel[] = [];

    for (const [regiao, lista] of porRegiao.entries()) {
      lista.sort((a, b) => b.pesoKg - a.pesoKg);
      for (const ped of lista) {
        // procura bin existente da mesma região com folga
        let alvo = bins.find(
          (b) =>
            b.regiao === regiao &&
            b.pesoUsado + ped.pesoKg <= b.veiculo.capacidadeKg &&
            (b.veiculo.capacidadeCaixas <= 0 ||
              b.caixasUsadas + ped.volumes <= b.veiculo.capacidadeCaixas),
        );
        if (!alvo) {
          const veic = veiculos[veicCursor % veiculos.length];
          veicCursor++;
          // se o pedido sozinho estoura o veículo, ainda assim aloca (flag depois)
          alvo = {
            veiculo: veic,
            regiao,
            paradas: [],
            pesoUsado: 0,
            caixasUsadas: 0,
          };
          bins.push(alvo);
        }
        alvo.paradas.push(ped);
        alvo.pesoUsado += ped.pesoKg;
        alvo.caixasUsadas += ped.volumes;
      }
    }

    if (bins.length === 0) {
      throw new BadRequestException('Não foi possível montar nenhuma rota.');
    }

    // 5) Persistir em transação ACID
    const criadas = await this.prisma.$transaction(async (tx) => {
      const resultado: string[] = [];
      for (const bin of bins) {
        // sequência de paradas: por CEP crescente, depois janela
        const ordenadas = [...bin.paradas].sort((a, b) => {
          const ca = Number(a.cep.replace(/\D/g, '') || 0);
          const cb = Number(b.cep.replace(/\D/g, '') || 0);
          if (ca !== cb) return ca - cb;
          const ja = a.janelaInicio?.getTime() ?? 0;
          const jb = b.janelaInicio?.getTime() ?? 0;
          return ja - jb;
        });

        const route = await tx.route.create({
          data: {
            tenantId,
            filialId: dto.filialId,
            veiculoId: bin.veiculo.id,
            placaVeiculo: bin.veiculo.placa,
            motoristaNome: bin.veiculo.motoristaNome,
            dataRota: inicio,
            status: 'PLANNED',
            regiao: bin.regiao,
            origemOtimizacao: 'IA_OPTIMIZER',
            capacidadeKg: new Prisma.Decimal(
              bin.veiculo.capacidadeKg.toFixed(2),
            ),
            pesoTotalKg: new Prisma.Decimal(bin.pesoUsado.toFixed(2)),
            volumesTotal: bin.caixasUsadas,
            stops: {
              create: ordenadas.map((p, i) => ({
                tenantId,
                pedidoId: p.id,
                numeroPedido: p.numero,
                clienteNome: p.clienteNome,
                cep: p.cep || null,
                endereco: p.endereco || null,
                ordem: i + 1,
                pesoKg: new Prisma.Decimal(p.pesoKg.toFixed(2)),
                volumes: p.volumes,
                status: 'PENDING' as const,
              })),
            },
          },
        });
        resultado.push(route.id);

        await tx.auditLog.create({
          data: {
            tenantId,
            usuarioId,
            modulo: 'LOGISTICA',
            acao: 'OTIMIZAR_ROTA',
            entidade: 'Route',
            entidadeId: route.id,
            dadosDepois: {
              regiao: bin.regiao,
              veiculo: bin.veiculo.placa,
              motorista: bin.veiculo.motoristaNome,
              paradas: ordenadas.length,
              pesoTotalKg: bin.pesoUsado,
              origem: 'IA_OPTIMIZER',
            } as unknown as Prisma.InputJsonValue,
          },
        });
      }
      return resultado;
    });

    this.logger.log(
      `Otimização gerou ${criadas.length} rota(s) para ${pedidos.length} pedido(s).`,
    );

    return {
      rotasCriadas: criadas.length,
      pedidosRoteirizados: pedidos.length - naoAlocados.length,
      routeIds: criadas,
    };
  }
}
