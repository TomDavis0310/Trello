import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

@Injectable()
export class BoardService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: number) {
    return this.prisma.client.board.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, userId: number) {
    const board = await this.prisma.client.board.findFirst({
      where: { id, userId },
      include: {
        lists: {
          orderBy: { order: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
            },
          },
        },
      },
    });
    if (!board) throw new NotFoundException('Board not found');
    return board;
  }

  async create(userId: number, dto: CreateBoardDto) {
    const board = await this.prisma.client.board.create({
      data: { userId, name: dto.name.trim() },
    });

    const GAP = 10000;
    const listData = [
      { name: 'Todo', order: GAP },
      { name: 'In Progress', order: 2 * GAP },
      { name: 'Review', order: 3 * GAP },
      { name: 'Done', order: 4 * GAP },
    ];

    await this.prisma.client.$transaction(
      listData.map(({ name, order }) =>
        this.prisma.client.list.create({
          data: { boardId: board.id, name, order },
        }),
      ),
    );

    return this.findOne(board.id, userId);
  }

  async update(id: number, userId: number, dto: UpdateBoardDto) {
    const board = await this.prisma.client.board.findFirst({
      where: { id, userId },
    });
    if (!board) throw new NotFoundException('Board not found');

    return this.prisma.client.board.update({
      where: { id },
      data: { name: dto.name?.trim() },
    });
  }

  async remove(id: number, userId: number) {
    const board = await this.prisma.client.board.findFirst({
      where: { id, userId },
    });
    if (!board) throw new NotFoundException('Board not found');

    await this.prisma.client.board.delete({ where: { id } });
    return { message: 'Board deleted' };
  }
}
