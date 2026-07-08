import { IsString, Length } from 'class-validator';

export class TwoFactorLoginDto {
  @IsString()
  @Length(32, 256)
  challengeToken!: string;

  @IsString()
  @Length(6, 12)
  code!: string;
}
