import { IsArray, IsString } from 'class-validator';

export class ReorderProductImagesDto {
  @IsArray()
  @IsString({ each: true })
  imageIds!: string[];
}
