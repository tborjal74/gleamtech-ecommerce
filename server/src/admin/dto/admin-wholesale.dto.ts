import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { WholesaleAccountStatus, WholesaleOrderStatus, WholesalePaymentStatus } from '@prisma/client';

export class WholesaleListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(80) search?: string;
}

export class UpsertWholesaleAccountDto {
  @IsString() @MaxLength(120) companyName!: string;
  @IsString() @MaxLength(120) contactName!: string;
  @IsEmail() @MaxLength(200) email!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsOptional() @IsString() @MaxLength(80) taxId?: string;
  @IsString() @MaxLength(500) billingAddress!: string;
  @IsString() @MaxLength(500) shippingAddress!: string;
  @IsString() @MaxLength(40) priceTier!: string;
  @IsInt() @Min(0) @Max(100) discountPercent!: number;
  @IsInt() @Min(0) @Max(365) paymentTermDays!: number;
  @IsInt() @Min(0) creditLimitMinor!: number;
  @IsInt() @Min(0) minimumOrderMinor!: number;
  @IsEnum(WholesaleAccountStatus) status!: WholesaleAccountStatus;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class WholesaleOrderItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) @Max(100000) quantity!: number;
  @IsInt() @Min(0) unitPriceMinor!: number;
}

export class CreateWholesaleOrderDto {
  @IsString() accountId!: string;
  @IsOptional() @IsString() @MaxLength(100) purchaseOrderNumber?: string;
  @IsInt() @Min(0) discountMinor!: number;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => WholesaleOrderItemDto)
  items!: WholesaleOrderItemDto[];
}

export class UpdateWholesaleOrderDto {
  @IsEnum(WholesaleOrderStatus) status!: WholesaleOrderStatus;
  @IsEnum(WholesalePaymentStatus) paymentStatus!: WholesalePaymentStatus;
}

export class ReviewWholesaleApplicationDto {
  @IsIn(['approve', 'reject']) decision!: "approve" | "reject";
  @IsOptional() @IsString() @MaxLength(1000) adminNote?: string;
  @IsOptional() @IsString() @MaxLength(40) priceTier?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) discountPercent?: number;
  @IsOptional() @IsInt() @Min(0) @Max(365) paymentTermDays?: number;
  @IsOptional() @IsInt() @Min(0) creditLimitMinor?: number;
  @IsOptional() @IsInt() @Min(0) minimumOrderMinor?: number;
}
