import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

/** Cadastro de um vendedor/representante que recebe comissão sobre vendas. */
export class CriarVendedorDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'nome é obrigatório.' })
  nome: string;

  @ApiPropertyOptional({ description: 'Vínculo opcional com um usuário do sistema.' })
  @IsOptional() @IsString()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Fornecedor usado ao gerar o título a pagar da comissão.' })
  @IsOptional() @IsString()
  fornecedorId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  documento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  telefone?: string;

  @ApiPropertyOptional({ description: '% de comissão padrão (0 a 100).' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'percentualPadrao deve ser numérico.' })
  @Min(0, { message: 'percentualPadrao deve ser >= 0.' })
  @Max(100, { message: 'percentualPadrao deve ser <= 100.' })
  percentualPadrao?: number;
}

/** Edição de um vendedor. */
export class AtualizarVendedorDto extends TenantAwareDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nome?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  usuarioId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  fornecedorId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  documento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  telefone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'percentualPadrao deve ser numérico.' })
  @Min(0) @Max(100)
  percentualPadrao?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}
