import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, ValidateIf } from 'class-validator';
import { TipoMovimentacao } from '@prisma/client';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

const optStr = () => (t: object, k: string) => {
  IsOptional()(t, k);
  ValidateIf((_, v) => v !== null)(t, k);
  IsString()(t, k);
};

export class AjusteEstoqueDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'filialId é obrigatório.' })
  filialId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'produtoId é obrigatório.' })
  produtoId: string;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  loteId?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  localizacaoId?: string | null;

  @ApiProperty({ enum: TipoMovimentacao })
  @IsEnum(TipoMovimentacao, { message: 'tipo de movimentação inválido.' })
  tipo: TipoMovimentacao;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'quantidade deve ser numérica.' })
  quantidade: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber({ maxDecimalPlaces: 6 })
  custoUnitario?: number;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  observacoes?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  permitirNegativo?: boolean;
}

export class TransferenciaEstoqueDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'filialOrigemId é obrigatório.' })
  filialOrigemId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'filialDestinoId é obrigatório.' })
  filialDestinoId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'produtoId é obrigatório.' })
  produtoId: string;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  loteId?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  localizacaoOrigemId?: string | null;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 6 }, { message: 'quantidade deve ser numérica.' })
  quantidade: number;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  observacoes?: string | null;
}
