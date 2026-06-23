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
import { BoardService } from './board.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('boards')
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.boardService.findAll(user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.boardService.findOne(id, user.sub);
  }

  @Post()
  create(@Body() dto: CreateBoardDto, @CurrentUser() user: any) {
    return this.boardService.create(user.sub, dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBoardDto,
    @CurrentUser() user: any,
  ) {
    return this.boardService.update(id, user.sub, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.boardService.remove(id, user.sub);
  }
}
