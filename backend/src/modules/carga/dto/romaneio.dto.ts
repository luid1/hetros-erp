import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, ArrayNotEmpty, IsNumber, Min, ValidateIf } from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

const optStr = () => (t: object, k: string) => {
  IsOptional()(t, k);
  ValidateIf((_, v) => v !== null)(t, k);
  IsString()(t, k);
};

export class CriarRomaneioDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'filialId é obrigatório.' })
  filialId: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'motorista é obrigatório.' })
  motorista: string;

  @ApiPropertyOptional({ nullable: true }) @optStr() codigoCondutor?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() foneCondutor?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() placaVeiculo?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() modeloVeiculo?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() tipoVeiculo?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() periodo?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() regiaoRota?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() dataMovimento?: string | null;
  @ApiPropertyOptional({ nullable: true }) @optStr() dataEntrega?: string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  refrigerado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'valorFrete deve ser numérico.' })
  @Min(0, { message: 'valorFrete não pode ser negativo.' })
  valorFrete?: number;

  @ApiProperty({ type: [String] })
  @IsArray() @ArrayNotEmpty({ message: 'Selecione ao menos um pedido.' })
  @IsString({ each: true })
  pedidoIds: string[];
}
