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
import { ListService } from './list.service';
import { CreateListDto, UpdateListDto, ReorderListDto } from './dto/list.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('lists')
export class ListController {
  constructor(private readonly listService: ListService) {}

  @Get()
  findAll() {
    return this.listService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.listService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateListDto) {
    return this.listService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateListDto) {
    return this.listService.update(id, dto);
  }

  @Put(':id/reorder')
  reorder(@Param('id', ParseIntPipe) id: number, @Body() dto: ReorderListDto) {
    return this.listService.reorder(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.listService.remove(id);
  }
}
