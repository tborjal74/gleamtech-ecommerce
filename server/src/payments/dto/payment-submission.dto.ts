import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class PaymentSubmissionDto {
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsString()
  @MinLength(6)
  @MaxLength(120)
  reference!: string;
}
