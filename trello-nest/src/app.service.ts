import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getFullData(userId: number) {
    const boards = await this.prisma.client.board.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (boards.length === 0) {
      return { boards: [], lists: [], cards: [] };
    }

    const boardIds = boards.map((b) => b.id);

    const lists = await this.prisma.client.list.findMany({
      where: { boardId: { in: boardIds } },
      orderBy: { order: 'asc' },
    });

    const cards = await this.prisma.client.card.findMany({
      where: { list: { boardId: { in: boardIds } } },
      orderBy: { position: 'asc' },
      include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
    });

    return { boards, lists, cards };
  }
}
