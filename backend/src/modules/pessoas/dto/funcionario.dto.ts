import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';
import { StatusFuncionario } from '@prisma/client';

export class CriarFuncionarioDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'nome é obrigatório.' })
  nome: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  filialId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  usuarioId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cpf?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  cargo?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  departamento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  salarioBase?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dataAdmissao?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dataDesligamento?: string;

  @ApiPropertyOptional({ enum: StatusFuncionario })
  @IsOptional() @IsEnum(StatusFuncionario)
  status?: StatusFuncionario;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  chavePix?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  banco?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  agencia?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  conta?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacoes?: string;
}

export class AtualizarFuncionarioDto extends CriarFuncionarioDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @IsNotEmpty()
  declare nome: string;
}
