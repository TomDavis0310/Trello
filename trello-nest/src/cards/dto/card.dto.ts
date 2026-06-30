import { IsString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';

export class CreateCardDto {
  @IsNumber()
  listId: number;

  @IsString()
  title: string;
}

export class UpdateCardDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class MoveCardDto {
  @IsNumber()
  targetListId: number;

  @IsInt()
  @Min(0)
  targetPosition: number;
}

export class AddCommentDto {
  @IsString()
  text: string;

  @IsString()
  @IsOptional()
  author?: string;
}

export class AddLabelDto {
  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  text?: string;
}

export class SetDueDateDto {
  @IsString()
  @IsOptional()
  dueDate?: string;
}
