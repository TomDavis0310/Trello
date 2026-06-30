import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloGateway } from '../common/gateways/trello.gateway';
import { CreateBoardDto, UpdateBoardDto } from './dto/board.dto';

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrelloGateway,
  ) {}

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
              include: {
                comments: { orderBy: { createdAt: 'asc' } },
                labels: true,
              },
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

    const listData = [
      { name: 'Todo', order: 0 },
      { name: 'In Progress', order: 1 },
      { name: 'Review', order: 2 },
      { name: 'Done', order: 3 },
    ];

    await this.prisma.client.$transaction(
      listData.map(({ name, order }) =>
        this.prisma.client.list.create({
          data: { boardId: board.id, name, order },
        }),
      ),
    );

    const result = await this.findOne(board.id, userId);
    this.gateway.emitBoardCreated(result);
    return result;
  }

  async update(id: number, userId: number, dto: UpdateBoardDto) {
    const board = await this.prisma.client.board.findFirst({
      where: { id, userId },
    });
    if (!board) throw new NotFoundException('Board not found');

    const result = await this.prisma.client.board.update({
      where: { id },
      data: { name: dto.name?.trim() },
    });
    this.gateway.emitBoardUpdated(result);
    return result;
  }

  async remove(id: number, userId: number) {
    const board = await this.prisma.client.board.findFirst({
      where: { id, userId },
    });
    if (!board) throw new NotFoundException('Board not found');

    await this.prisma.client.board.delete({ where: { id } });
    this.gateway.emitBoardDeleted({ id, message: 'Board deleted' });
    return { message: 'Board deleted' };
  }
}
