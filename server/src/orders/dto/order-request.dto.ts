import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OrderRequestDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason!: string;
}

export class ReviewOrderRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNote?: string;
}
