import { IsIn } from 'class-validator';
import { PaymentStatus } from '@prisma/client';

export class UpdatePaymentStatusDto {
  @IsIn([PaymentStatus.PAID])
  paymentStatus!: PaymentStatus;
}
