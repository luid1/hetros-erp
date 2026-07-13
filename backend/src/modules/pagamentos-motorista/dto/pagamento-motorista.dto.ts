import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

export class CriarPagamentoMotoristaDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'descricao é obrigatória.' })
  descricao: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  valor: number;

  @ApiProperty()
  @IsDateString()
  dataReferencia: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  filialId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  routeId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  motoristaId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  motoristaNome?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  funcionarioId?: string;

  @ApiPropertyOptional({ description: 'Se o motorista for terceirizado (fornecedor).' })
  @IsOptional() @IsString()
  fornecedorId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacoes?: string;
}

export class AprovarPagamentoMotoristaDto extends TenantAwareDto {
  @ApiPropertyOptional({ description: 'Ajusta o valor no momento da aprovação.' })
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  valor?: number;

  @ApiPropertyOptional({ description: 'Vencimento da conta a pagar (default: hoje).' })
  @IsOptional() @IsDateString()
  dataVencimento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  fornecedorId?: string;
}
