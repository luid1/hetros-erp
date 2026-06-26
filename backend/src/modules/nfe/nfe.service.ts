import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { TipoMovimentacao, StatusDFe } from '@prisma/client';

@Injectable()
export class NFeService {
  private readonly logger = new Logger(NFeService.name);

  constructor(
    private prisma: PrismaService,
    private estoque: EstoqueService,
    private events: EventEmitter2,
  ) {}

  /**
   * Monta a NF-e a partir de um Pedido confirmado
   */
  async gerarDesPedido(tenantId: string, pedidoId: string, filialId: string, usuarioId: string) {
    const pedido = await this.prisma.pedido.findFirst({
      where: { id: pedidoId, tenantId },
      include: {
        cliente: true,
        itens: { include: { produto: { include: { unidadeMedida: true } } } },
        filialOrigem: true,
      },
    });

    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (pedido.status !== 'SEPARADO' && pedido.status !== 'CONFIRMADO') {
      throw new BadRequestException(`Pedido com status ${pedido.status} não pode ser faturado.`);
    }

    const filial = pedido.filialOrigem;

    // Próximo número de NF-e da filial/série
    const ultimo = await this.prisma.nFe.findFirst({
      where: { tenantId, filialId, serie: '1', modelo: '55' },
      orderBy: { numero: 'desc' },
    });
    const numero = (ultimo?.numero || 0) + 1;

    const nfe = await this.prisma.nFe.create({
      data: {
        tenantId,
        filialId,
        clienteId: pedido.clienteId,
        pedidoId,
        tipo: 'NFE',
        modelo: '55',
        serie: '1',
        numero,
        status: StatusDFe.RASCUNHO,
        naturezaOperacao: 'VENDA DE MERCADORIAS',
        cfop: '5102',
        emitenteCnpj: filial.cnpj || '',
        destCnpjCpf: pedido.cliente?.cnpjCpf,
        destRazaoSocial: pedido.cliente?.razaoSocial,
        destEnderecoJson: pedido.cliente?.enderecoJson,
        valorProdutos: pedido.subtotal,
        valorFrete: pedido.valorFrete,
        valorDesconto: pedido.descontoTotal,
        valorNfe: pedido.valorTotal,
        itens: {
          create: pedido.itens.map((item, idx) => ({
            produtoId: item.produtoId,
            ordem: idx + 1,
            codigo: item.produto.codigo,
            descricao: item.descricao,
            ncm: item.produto.ncm,
            cfop: item.cfop || '5102',
            unidade: item.produto.unidadeMedida.sigla,
            quantidade: item.quantidade,
            valorUnitario: item.precoUnitario,
            valorDesconto: item.desconto,
            valorTotal: item.valorTotal,
            cstCsosn: item.cstIcms || '400',
            aliquotaIcms: item.aliquotaIcms,
            valorIcms: item.valorIcms,
            valorPis: item.valorPis,
            valorCofins: item.valorCofins,
          })),
        },
      },
      include: { itens: true },
    });

    return nfe;
  }

  /**
   * Envia a NF-e para o SEFAZ via API (Focus NFe / NFe.io / etc.)
   * Após sucesso: baixa estoque + gera conta a receber (Event-Driven)
   */
  async emitir(tenantId: string, nfeId: string, usuarioId: string) {
    const nfe = await this.prisma.nFe.findFirst({
      where: { id: nfeId, tenantId },
      include: {
        itens: { include: { produto: true } },
        pedido: true,
        filial: true,
      },
    });

    if (!nfe) throw new NotFoundException('NF-e não encontrada.');
    if (nfe.status !== StatusDFe.RASCUNHO && nfe.status !== StatusDFe.PENDENTE_EMISSAO) {
      throw new BadRequestException(`NF-e com status ${nfe.status} não pode ser emitida.`);
    }

    // Marca como pendente
    await this.prisma.nFe.update({ where: { id: nfeId }, data: { status: StatusDFe.PENDENTE_EMISSAO } });

    try {
      // Chama a API do SEFAZ (Focus NFe ou similar)
      const resultado = await this.chamarApiSefaz(nfe);

      // Atualiza com dados do SEFAZ
      await this.prisma.nFe.update({
        where: { id: nfeId },
        data: {
          status: StatusDFe.EMITIDO,
          chaveAcesso: resultado.chaveAcesso,
          protocolo: resultado.protocolo,
          xmlEmitido: resultado.xml,
          pdfDanfe: resultado.danfeUrl,
          dataEmissao: new Date(),
        },
      });

      this.logger.log(`✅ NF-e ${nfe.serie}/${nfe.numero} emitida — chave: ${resultado.chaveAcesso}`);

      // 🔥 EVENTO: Baixa de estoque + Financeiro automáticos
      this.events.emit('nfe.emitida', {
        tenantId,
        nfeId,
        filialId: nfe.filialId,
        pedidoId: nfe.pedidoId,
        itens: nfe.itens,
        valorNfe: nfe.valorNfe,
        clienteId: nfe.clienteId,
        usuarioId,
      });

      return { status: 'EMITIDA', chaveAcesso: resultado.chaveAcesso, danfeUrl: resultado.danfeUrl };
    } catch (err) {
      await this.prisma.nFe.update({ where: { id: nfeId }, data: { status: StatusDFe.RASCUNHO } });
      throw new BadRequestException(`Erro ao emitir NF-e: ${err.message}`);
    }
  }

  /**
   * Listener do evento 'nfe.emitida':
   * 1. Baixa estoque de cada item
   * 2. Gera Conta a Receber
   * 3. Atualiza status do Pedido para FATURADO
   */
  @OnEvent('nfe.emitida')
  async handleNFeEmitida(payload: {
    tenantId: string; nfeId: string; filialId: string; pedidoId?: string;
    itens: any[]; valorNfe: any; clienteId?: string; usuarioId: string;
  }) {
    this.logger.log(`📦 Processando evento nfe.emitida — NF-e ${payload.nfeId}`);

    try {
      // 1. Baixa de estoque para cada item
      for (const item of payload.itens) {
        if (!item.produtoId) continue;
        await this.estoque.movimentar(payload.tenantId, {
          filialId: payload.filialId,
          produtoId: item.produtoId,
          tipo: TipoMovimentacao.SAIDA_VENDA,
          quantidade: Number(item.quantidade),
          nfeId: payload.nfeId,
          usuarioId: payload.usuarioId,
          observacoes: `Baixa automática NF-e ${payload.nfeId}`,
        });
      }

      // 2. Gera Conta a Receber
      await this.prisma.contaReceber.create({
        data: {
          tenantId: payload.tenantId,
          filialId: payload.filialId,
          clienteId: payload.clienteId,
          pedidoId: payload.pedidoId,
          nfeId: payload.nfeId,
          descricao: `Venda — NF-e ${payload.nfeId.slice(0, 8)}`,
          valorOriginal: Number(payload.valorNfe),
          dataVencimento: new Date(Date.now() + 30 * 86400000), // 30 dias padrão
          status: 'ABERTO',
        },
      });

      // 3. Atualiza pedido para FATURADO
      if (payload.pedidoId) {
        await this.prisma.pedido.update({
          where: { id: payload.pedidoId },
          data: { status: 'FATURADO' },
        });
      }

      this.logger.log(`✅ nfe.emitida processado — estoque baixado + conta a receber gerada`);
    } catch (err) {
      this.logger.error(`❌ Erro ao processar nfe.emitida: ${err.message}`, err.stack);
    }
  }

  async cancelar(tenantId: string, nfeId: string, motivo: string) {
    const nfe = await this.prisma.nFe.findFirst({ where: { id: nfeId, tenantId } });
    if (!nfe) throw new NotFoundException('NF-e não encontrada.');
    if (nfe.status !== StatusDFe.EMITIDO) throw new BadRequestException('Apenas NF-e emitidas podem ser canceladas.');
    if (!nfe.chaveAcesso) throw new BadRequestException('NF-e sem chave de acesso.');

    // Chama SEFAZ para cancelamento
    const xml = await this.cancelarSefaz(nfe.chaveAcesso, motivo);

    await this.prisma.nFe.update({
      where: { id: nfeId },
      data: {
        status: StatusDFe.CANCELADO,
        motivoCancelamento: motivo,
        xmlCancelamento: xml,
        dataCancelamento: new Date(),
      },
    });

    // Estorna estoque e cancela conta a receber
    this.events.emit('nfe.cancelada', { tenantId, nfeId });

    return { status: 'CANCELADA' };
  }

  async findAll(tenantId: string, filialId: string, filters: { status?: StatusDFe; dataInicio?: Date; dataFim?: Date }) {
    return this.prisma.nFe.findMany({
      where: {
        tenantId, filialId,
        ...(filters.status && { status: filters.status }),
        ...(filters.dataInicio && { dataEmissao: { gte: filters.dataInicio, ...(filters.dataFim && { lte: filters.dataFim }) } }),
      },
      include: {
        cliente: { select: { razaoSocial: true, cnpjCpf: true } },
        pedido: { select: { numero: true } },
        _count: { select: { itens: true } },
      },
      orderBy: { numero: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.nFe.findFirst({
      where: { id, tenantId },
      include: { itens: { include: { produto: { select: { codigo: true, descricao: true } } } }, cliente: true },
    });
  }

  private async chamarApiSefaz(nfe: any): Promise<{ chaveAcesso: string; protocolo: string; xml: string; danfeUrl: string }> {
    // Mock para desenvolvimento — substitua pela integração real (Focus NFe, NFe.io, etc.)
    const fakeChave = `35${new Date().getFullYear()}${nfe.emitenteCnpj.replace(/\D/g, '').padStart(14, '0')}55${nfe.serie.padStart(3, '0')}${String(nfe.numero).padStart(9, '0')}1${Date.now().toString().slice(-9)}`;
    return {
      chaveAcesso: fakeChave.slice(0, 44),
      protocolo: `135${Date.now()}`,
      xml: `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe${fakeChave.slice(0, 44)}"/></NFe></nfeProc>`,
      danfeUrl: `https://sistema.exemplo.com/danfe/${nfe.id}.pdf`,
    };
  }

  private async cancelarSefaz(chave: string, motivo: string): Promise<string> {
    return `<retEvento><infEvento><cStat>135</cStat><xMotivo>${motivo}</xMotivo></infEvento></retEvento>`;
  }
}
