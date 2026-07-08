import { IsString, Length } from 'class-validator';

export class TwoFactorSetupDto {
  @IsString()
  @Length(1, 128)
  password!: string;
}

export class TwoFactorConfirmDto {
  @IsString()
  @Length(6, 12)
  code!: string;
}

export class TwoFactorDisableDto {
  @IsString()
  @Length(6, 12)
  code!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}
