import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveAddressDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  label = 'Default';

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(180)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  line2?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  region!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postal?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country = 'PH';

  @IsOptional()
  @IsBoolean()
  isDefault = true;
}
