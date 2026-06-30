import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloGateway } from '../common/gateways/trello.gateway';
import { CreateListDto, UpdateListDto, ReorderListDto } from './dto/list.dto';

@Injectable()
export class ListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TrelloGateway,
  ) {}

  findAll() {
    return this.prisma.client.list.findMany({
      orderBy: [{ boardId: 'asc' }, { order: 'asc' }],
    });
  }

  async findOne(id: number) {
    const list = await this.prisma.client.list.findUnique({
      where: { id },
      include: {
        cards: {
          orderBy: { position: 'asc' },
          include: {
            comments: { orderBy: { createdAt: 'asc' } },
            labels: true,
          },
        },
      },
    });
    if (!list) throw new NotFoundException('List not found');
    return list;
  }

  async create(dto: CreateListDto) {
    const board = await this.prisma.client.board.findUnique({
      where: { id: dto.boardId },
    });
    if (!board) throw new NotFoundException('Board not found');

    const { _max } = await this.prisma.client.list.aggregate({
      where: { boardId: dto.boardId },
      _max: { order: true },
    });

    const list = await this.prisma.client.list.create({
      data: {
        boardId: dto.boardId,
        name: dto.name.trim(),
        order: (_max.order ?? -1) + 1,
      },
    });
    this.gateway.emitListCreated(list);
    return list;
  }

  async update(id: number, dto: UpdateListDto) {
    const list = await this.prisma.client.list.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('List not found');

    const updated = await this.prisma.client.list.update({
      where: { id },
      data: { name: dto.name?.trim() },
    });
    this.gateway.emitListUpdated(updated);
    return updated;
  }

  async remove(id: number) {
    const list = await this.prisma.client.list.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('List not found');

    const boardId = list.boardId;

    await this.prisma.client.list.delete({ where: { id } });

    const remaining = await this.prisma.client.list.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
    });

    await this.prisma.client.$transaction(
      remaining.map((r, i) =>
        this.prisma.client.list.update({
          where: { id: r.id },
          data: { order: i },
        }),
      ),
    );

    this.gateway.emitListDeleted({ id, message: 'List deleted' });
    return { message: 'List deleted' };
  }

  async reorder(id: number, dto: ReorderListDto) {
    const src = await this.prisma.client.list.findUnique({ where: { id } });
    const tgt = await this.prisma.client.list.findUnique({
      where: { id: dto.targetListId },
    });

    if (!src || !tgt || src.boardId !== tgt.boardId) {
      throw new BadRequestException(
        'Reorder failed: lists must be in the same board',
      );
    }

    const rows = await this.prisma.client.list.findMany({
      where: { boardId: src.boardId },
      orderBy: { order: 'asc' },
    });

    const si = rows.findIndex((r) => r.id === id);
    const ti = rows.findIndex((r) => r.id === dto.targetListId);
    if (si === -1 || ti === -1) {
      throw new BadRequestException('Reorder failed');
    }

    if (si === ti) {
      return rows;
    }

    const reordered = [...rows];
    const [moved] = reordered.splice(si, 1);
    reordered.splice(ti, 0, moved);

    await this.prisma.client.$transaction(
      reordered.map((r, i) =>
        this.prisma.client.list.update({
          where: { id: r.id },
          data: { order: i },
        }),
      ),
    );

    const result = await this.prisma.client.list.findMany({
      where: { boardId: src.boardId },
      orderBy: { order: 'asc' },
    });
    this.gateway.emitListReordered(result);
    return result;
  }
}
