import { IsIn } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsIn(Object.values(OrderStatus))
  status!: OrderStatus;
}
