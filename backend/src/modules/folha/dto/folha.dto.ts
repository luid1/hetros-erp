import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Matches,
} from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';
import { TipoItemFolha } from '@prisma/client';

export class CriarFolhaDto extends TenantAwareDto {
  @ApiProperty({ description: 'Competência no formato AAAA-MM.' })
  @IsString() @Matches(/^\d{4}-\d{2}$/, { message: 'competencia deve estar no formato AAAA-MM.' })
  competencia: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  filialId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descricao?: string;

  @ApiPropertyOptional({ description: 'Vencimento das contas a pagar geradas no fechamento.' })
  @IsOptional() @IsDateString()
  dataPagamento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacoes?: string;
}

export class AtualizarFolhaDto extends TenantAwareDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  descricao?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dataPagamento?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  observacoes?: string;
}

export class ItemFolhaDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'funcionarioId é obrigatório.' })
  funcionarioId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'descricao é obrigatória.' })
  descricao: string;

  @ApiPropertyOptional({ enum: TipoItemFolha })
  @IsOptional() @IsEnum(TipoItemFolha)
  tipo?: TipoItemFolha;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  valor: number;
}

export class FecharFolhaDto extends TenantAwareDto {
  @ApiPropertyOptional({ description: 'Vencimento das contas a pagar (default: hoje).' })
  @IsOptional() @IsDateString()
  dataPagamento?: string;
}
