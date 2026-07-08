import { IsBoolean } from 'class-validator';

export class UpdateCustomerActiveDto {
  @IsBoolean()
  active!: boolean;
}
