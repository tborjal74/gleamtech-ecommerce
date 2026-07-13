import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class SubmitWholesaleApplicationDto {
  @IsString() @MaxLength(120) companyName!: string;
  @IsString() @MaxLength(120) contactName!: string;
  @IsString() @MaxLength(40) phone!: string;
  @IsOptional() @IsString() @MaxLength(80) taxId?: string;
  @IsString() @MaxLength(500) billingAddress!: string;
  @IsString() @MaxLength(500) shippingAddress!: string;
  @IsString() @MaxLength(100) businessType!: string;
  @IsInt() @Min(0) estimatedMonthlySpendMinor!: number;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
}

export class CustomerWholesaleOrderItemDto {
  @IsString() productId!: string;
  @IsInt() @Min(1) @Max(100000) quantity!: number;
}

export class CreateCustomerWholesaleOrderDto {
  @IsOptional() @IsString() @MaxLength(100) purchaseOrderNumber?: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => CustomerWholesaleOrderItemDto)
  items!: CustomerWholesaleOrderItemDto[];
}
