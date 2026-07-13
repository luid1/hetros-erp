import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, StatusFuncionario } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { money, toNumber } from '../../common/utils/money.util';
import { CriarFuncionarioDto, AtualizarFuncionarioDto } from './dto/funcionario.dto';

@Injectable()
export class PessoasService {
  constructor(private prisma: PrismaService) {}

  private serializar(f: any) {
    return { ...f, salarioBase: toNumber(f.salarioBase) };
  }

  async listar(tenantId: string, status?: StatusFuncionario, filialId?: string) {
    const rows = await this.prisma.funcionario.findMany({
      where: { tenantId, ...(status ? { status } : {}), ...(filialId ? { filialId } : {}) },
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
    });
    return rows.map((f) => this.serializar(f));
  }

  async findOne(tenantId: string, id: string) {
    const f = await this.prisma.funcionario.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Funcionário não encontrado.');
    return this.serializar(f);
  }

  async criar(tenantId: string, dto: CriarFuncionarioDto) {
    if (!dto.nome?.trim()) throw new BadRequestException('Informe o nome.');
    const f = await this.prisma.funcionario.create({
      data: {
        tenantId,
        filialId: dto.filialId || null,
        usuarioId: dto.usuarioId || null,
        nome: dto.nome.trim(),
        cpf: dto.cpf || null,
        cargo: dto.cargo || null,
        departamento: dto.departamento || null,
        salarioBase: new Prisma.Decimal(money(dto.salarioBase ?? 0)),
        dataAdmissao: dto.dataAdmissao ? new Date(dto.dataAdmissao) : null,
        dataDesligamento: dto.dataDesligamento ? new Date(dto.dataDesligamento) : null,
        status: dto.status || StatusFuncionario.ATIVO,
        chavePix: dto.chavePix || null,
        banco: dto.banco || null,
        agencia: dto.agencia || null,
        conta: dto.conta || null,
        observacoes: dto.observacoes || null,
      },
    });
    return this.serializar(f);
  }

  async atualizar(tenantId: string, id: string, dto: AtualizarFuncionarioDto) {
    await this.findOne(tenantId, id);
    const data: Prisma.FuncionarioUpdateInput = {};
    if (dto.nome !== undefined) data.nome = dto.nome.trim();
    if (dto.filialId !== undefined) data.filialId = dto.filialId || null;
    if (dto.usuarioId !== undefined) data.usuarioId = dto.usuarioId || null;
    if (dto.cpf !== undefined) data.cpf = dto.cpf || null;
    if (dto.cargo !== undefined) data.cargo = dto.cargo || null;
    if (dto.departamento !== undefined) data.departamento = dto.departamento || null;
    if (dto.salarioBase !== undefined) data.salarioBase = new Prisma.Decimal(money(dto.salarioBase));
    if (dto.dataAdmissao !== undefined)
      data.dataAdmissao = dto.dataAdmissao ? new Date(dto.dataAdmissao) : null;
    if (dto.dataDesligamento !== undefined)
      data.dataDesligamento = dto.dataDesligamento ? new Date(dto.dataDesligamento) : null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.chavePix !== undefined) data.chavePix = dto.chavePix || null;
    if (dto.banco !== undefined) data.banco = dto.banco || null;
    if (dto.agencia !== undefined) data.agencia = dto.agencia || null;
    if (dto.conta !== undefined) data.conta = dto.conta || null;
    if (dto.observacoes !== undefined) data.observacoes = dto.observacoes || null;

    const f = await this.prisma.funcionario.update({ where: { id }, data });
    return this.serializar(f);
  }

  async remover(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Se já participa de alguma folha, apenas desliga (mantém histórico).
    const usado = await this.prisma.itemFolha.count({ where: { funcionarioId: id } });
    if (usado > 0) {
      const f = await this.prisma.funcionario.update({
        where: { id },
        data: { status: StatusFuncionario.DESLIGADO, dataDesligamento: new Date() },
      });
      return { ...this.serializar(f), desligado: true };
    }
    await this.prisma.funcionario.delete({ where: { id } });
    return { ok: true };
  }
}
