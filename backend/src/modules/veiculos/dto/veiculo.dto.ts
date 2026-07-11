import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateIf } from 'class-validator';
import { TenantAwareDto } from '../../../common/dto/tenant-aware.dto';

const optStr = () => (t: object, k: string) => {
  IsOptional()(t, k);
  ValidateIf((_, v) => v !== null)(t, k);
  IsString()(t, k);
};

// Campos numéricos podem chegar como string do formulário; o service normaliza.
const optNumLike = () => (t: object, k: string) => {
  IsOptional()(t, k);
};

export class CreateVeiculoDto extends TenantAwareDto {
  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'placa é obrigatória.' })
  placa: string;

  @ApiProperty()
  @IsString() @IsNotEmpty({ message: 'tipo é obrigatório.' })
  tipo: string;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  uf?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  marca?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  modelo?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  propriedade?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  motoristaPadrao?: string | null;

  @ApiPropertyOptional({ nullable: true }) @optStr()
  transportadoraId?: string | null;

  @ApiPropertyOptional() @optNumLike()
  anoFabricacao?: number | string | null;

  @ApiPropertyOptional() @optNumLike()
  capacidadeKg?: number | string | null;

  @ApiPropertyOptional() @optNumLike()
  capacidadeM3?: number | string | null;

  @ApiPropertyOptional() @optNumLike()
  capacidadeCaixasH?: number | string | null;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  refrigerado?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}

export class UpdateVeiculoDto extends PartialType(CreateVeiculoDto) {}
