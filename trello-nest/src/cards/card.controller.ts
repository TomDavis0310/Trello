import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CardService } from './card.service';
import {
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  AddCommentDto,
  AddLabelDto,
  SetDueDateDto,
} from './dto/card.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('cards')
export class CardController {
  constructor(private readonly cardService: CardService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cardService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCardDto) {
    return this.cardService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardService.update(id, dto);
  }

  @Put(':id/move')
  move(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MoveCardDto,
  ) {
    return this.cardService.move(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cardService.remove(id);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCommentDto,
  ) {
    return this.cardService.addComment(id, dto);
  }

  @Delete(':id/comments/:commentId')
  removeComment(
    @Param('id', ParseIntPipe) id: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.cardService.removeComment(id, commentId);
  }

  @Post(':id/labels')
  addLabel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddLabelDto,
  ) {
    return this.cardService.addLabel(id, dto);
  }

  @Delete(':id/labels/:labelId')
  removeLabel(
    @Param('id', ParseIntPipe) id: number,
    @Param('labelId', ParseIntPipe) labelId: number,
  ) {
    return this.cardService.removeLabel(id, labelId);
  }

  @Put(':id/due-date')
  setDueDate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetDueDateDto,
  ) {
    return this.cardService.setDueDate(id, dto);
  }
}
