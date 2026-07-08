import { IsIn, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CheckoutDto {
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  shippingName!: string;

  @IsString()
  @MinLength(7)
  @MaxLength(30)
  shippingPhone!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  shippingLine1!: string;

  @IsString()
  @MaxLength(160)
  shippingLine2!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  shippingCity!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  shippingRegion!: string;

  @IsString()
  @MaxLength(30)
  shippingPostal!: string;

  @IsString()
  @Length(2, 2)
  @IsIn(['PH'])
  shippingCountry!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  customerNote?: string;
}
