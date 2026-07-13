import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

/**
 * Fecha as comissões PENDENTES em um título a pagar por vendedor.
 * Se `vendedorId` for informado, fecha só o desse vendedor; senão, fecha todos.
 */
export class FecharComissaoDto extends TenantAwareDto {
  @ApiPropertyOptional({ description: 'Fecha só as comissões deste vendedor.' })
  @IsOptional() @IsString()
  vendedorId?: string;

  @ApiPropertyOptional({ description: 'Início do período de competência (ISO).' })
  @IsOptional() @IsDateString()
  dataInicio?: string;

  @ApiPropertyOptional({ description: 'Fim do período de competência (ISO).' })
  @IsOptional() @IsDateString()
  dataFim?: string;

  @ApiProperty({ description: 'Vencimento do(s) título(s) a pagar gerado(s).' })
  @IsDateString({}, { message: 'dataVencimento deve ser uma data válida.' })
  dataVencimento: string;
}
