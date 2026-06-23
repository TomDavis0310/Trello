import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListDto, UpdateListDto, ReorderListDto } from './dto/list.dto';

@Injectable()
export class ListService {
  constructor(private readonly prisma: PrismaService) {}

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
          include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
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

    return this.prisma.client.list.create({
      data: {
        boardId: dto.boardId,
        name: dto.name.trim(),
        order: (_max.order ?? -1) + 1,
      },
    });
  }

  async update(id: number, dto: UpdateListDto) {
    const list = await this.prisma.client.list.findUnique({ where: { id } });
    if (!list) throw new NotFoundException('List not found');

    return this.prisma.client.list.update({
      where: { id },
      data: { name: dto.name?.trim() },
    });
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

    return { message: 'List deleted' };
  }

  async reorder(id: number, dto: ReorderListDto) {
    const src = await this.prisma.client.list.findUnique({ where: { id } });
    const tgt = await this.prisma.client.list.findUnique({ where: { id: dto.targetListId } });

    if (!src || !tgt || src.boardId !== tgt.boardId) {
      throw new BadRequestException('Reorder failed: lists must be in the same board');
    }

    const rows = await this.prisma.client.list.findMany({
      where: { boardId: src.boardId },
      orderBy: { order: 'asc' },
    });

    const si = rows.findIndex((r) => Number(r.id) === Number(id));
    const ti = rows.findIndex((r) => Number(r.id) === Number(dto.targetListId));
    if (si === -1 || ti === -1) {
      throw new BadRequestException('Reorder failed');
    }

    // Nếu vị trí không đổi, trả về luôn
    if (si === ti) {
      return rows;
    }

    // Lọc bỏ phần tử đang được kéo
    const withoutSource = rows.filter((_, i) => i !== si);
    const moved = rows[si];

    console.log("=== [BACKEND LOG] KIỂM TRA THUẬT TOÁN DI CHUYỂN LIST ===");
    console.log("Mảng gốc lấy từ DB (orderBy order):", rows.map(r => ({ id: r.id, name: r.name, order: r.order })));
    console.log(`Chỉ số nguồn (si): ${si}, Chỉ số đích (ti): ${ti}`);

    // --- Gap-based ordering: chỉ update phần tử di chuyển, giữ nguyên phần còn lại ---
    if (ti === 0) {
      // 1) Kéo lên ĐẦU mảng
      const newOrder = withoutSource[0].order - 1;
      await this.prisma.client.list.update({
        where: { id: moved.id },
        data: { order: newOrder },
      });
    } else if (ti >= withoutSource.length) {
      // 2) Kéo xuống CUỐI mảng
      const newOrder = withoutSource[withoutSource.length - 1].order + 1;
      await this.prisma.client.list.update({
        where: { id: moved.id },
        data: { order: newOrder },
      });
    } else {
      // 3) Kéo vào GIỮA
      const left = withoutSource[ti - 1];
      const right = withoutSource[ti];
      const gap = right.order - left.order;

      if (gap > 1) {
        // Có khoảng trống → đặt ở giữa
        const newOrder = Math.floor((left.order + right.order) / 2);
        await this.prisma.client.list.update({
          where: { id: moved.id },
          data: { order: newOrder },
        });
      } else {
        // Không đủ khoảng trống → renumber toàn bộ với step 10
        const STEP = 10;
        const renumbered = [
          ...withoutSource.slice(0, ti),
          moved,
          ...withoutSource.slice(ti),
        ].map((r, i) => ({ id: r.id, order: (i + 1) * STEP }));

        await this.prisma.client.$transaction(
          renumbered.map((r) =>
            this.prisma.client.list.update({
              where: { id: r.id },
              data: { order: r.order },
            }),
          ),
        );
      }
    }

    return this.prisma.client.list.findMany({
      where: { boardId: src.boardId },
      orderBy: { order: 'asc' },
    });
  }
}
