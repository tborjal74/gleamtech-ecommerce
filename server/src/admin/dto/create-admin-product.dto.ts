import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

function trim(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}

const PRODUCT_CATEGORIES = ['Kitchen', 'Bathroom', 'Laundry', 'Floor', 'Others'] as const;

export class CreateAdminProductDto {
  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  sku!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(220)
  shortDescription!: string;

  @Transform(({ value }) => trim(value))
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  priceCents!: number;

  @Transform(({ value }) => nullableNumber(value))
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  weightGrams?: number | null;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  stockQuantity!: number;

  @Transform(({ value }) => trim(value))
  @IsString()
  @IsIn(PRODUCT_CATEGORIES)
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(80)
  scent?: string;

  @IsOptional()
  @IsBoolean()
  isEco = false;

  @IsOptional()
  @IsBoolean()
  isActive = true;

  @IsOptional()
  @IsBoolean()
  isPublished = true;

  @IsOptional()
  @Transform(({ value }) => trim(value))
  @IsString()
  @MaxLength(400)
  primaryImageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  sizes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags?: string[];
}
