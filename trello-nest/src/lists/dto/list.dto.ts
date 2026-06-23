import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateListDto {
  @IsNumber()
  boardId: number;

  @IsString()
  name: string;
}

export class UpdateListDto {
  @IsString()
  @IsOptional()
  name?: string;
}

export class ReorderListDto {
  @IsNumber()
  targetListId: number;
}
