import { IsString, MinLength } from 'class-validator';

export class GoogleCredentialDto {
  @IsString()
  @MinLength(20)
  credential!: string;
}
