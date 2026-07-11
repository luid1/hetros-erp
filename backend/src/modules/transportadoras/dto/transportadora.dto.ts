import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsObject, ValidateIf } from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

const optStr = () => (t: object, k: string) => {
  IsOptional()(t, k);
  ValidateIf((_, v) => v !== null)(t, k);
  IsString()(t, k);
};

export class CreateTransportadoraDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'razaoSocial é obrigatória.' })
  razaoSocial: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'cnpj/cpf é obrigatório.' })
  cnpj: string;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  nomeFantasia?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  ie?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  antt?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  telefone?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  placaPrincipal?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  tipoVeiculo?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  regiaoAtuacao?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined && v !== '')
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'freteBaseKg deve ser numérico.' })
  freteBaseKg?: number | string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsObject()
  enderecoJson?: Record<string, any> | null;

  @ApiPropertyOptional()
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsObject()
  endereco?: Record<string, any> | null;
}

export class UpdateTransportadoraDto extends PartialType(CreateTransportadoraDto) {}
