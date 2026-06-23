import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCardDto,
  UpdateCardDto,
  MoveCardDto,
  AddCommentDto,
  AddLabelDto,
  SetDueDateDto,
} from './dto/card.dto';

@Injectable()
export class CardService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const card = await this.prisma.client.card.findUnique({
      where: { id },
      include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
    });
    if (!card) throw new NotFoundException('Card not found');
    return card;
  }

  async create(dto: CreateCardDto) {
    const list = await this.prisma.client.list.findUnique({
      where: { id: dto.listId },
    });
    if (!list) throw new NotFoundException('List not found');

    const { _max } = await this.prisma.client.card.aggregate({
      where: { listId: dto.listId },
      _max: { position: true },
    });

    return this.prisma.client.card.create({
      data: {
        listId: dto.listId,
        title: dto.title.trim(),
        position: (_max.position ?? -1) + 1,
      },
      include: { comments: true, labels: true },
    });
  }

  async update(id: number, dto: UpdateCardDto) {
    const card = await this.prisma.client.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;

    return this.prisma.client.card.update({
      where: { id },
      data,
      include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
    });
  }

  async remove(id: number) {
    const card = await this.prisma.client.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');

    await this.prisma.client.card.delete({ where: { id } });

    await this.renumberList(card.listId);

    return { message: 'Card deleted' };
  }

  async move(id: number, dto: MoveCardDto) {
    const card = await this.prisma.client.card.findUnique({ where: { id } });
    if (!card) throw new NotFoundException('Card not found');

    const targetList = await this.prisma.client.list.findUnique({
      where: { id: dto.targetListId },
    });
    if (!targetList) throw new NotFoundException('Target list not found');

    const sourceListId = card.listId;

    await this.prisma.client.$transaction(async (tx) => {
      if (sourceListId === dto.targetListId) {
        const allCards = await tx.card.findMany({
          where: { listId: sourceListId },
          orderBy: { position: 'asc' },
        });
        const filtered = allCards.filter((c) => c.id !== id);
        filtered.splice(dto.targetPosition, 0, card);
        for (let i = 0; i < filtered.length; i++) {
          await tx.card.update({
            where: { id: filtered[i].id },
            data: { position: i },
          });
        }
      } else {
        const sourceCards = await tx.card.findMany({
          where: { listId: sourceListId },
          orderBy: { position: 'asc' },
        });
        const filteredSource = sourceCards.filter((c) => c.id !== id);
        for (let i = 0; i < filteredSource.length; i++) {
          await tx.card.update({
            where: { id: filteredSource[i].id },
            data: { position: i },
          });
        }

        const targetCards = await tx.card.findMany({
          where: { listId: dto.targetListId },
          orderBy: { position: 'asc' },
        });
        targetCards.splice(dto.targetPosition, 0, { ...card, listId: dto.targetListId });
        for (let i = 0; i < targetCards.length; i++) {
          await tx.card.update({
            where: { id: targetCards[i].id },
            data: { listId: dto.targetListId, position: i },
          });
        }
      }
    });

    const sourceCards = await this.prisma.client.card.findMany({
      where: { listId: sourceListId },
      orderBy: { position: 'asc' },
      include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
    });
    const targetCards = await this.prisma.client.card.findMany({
      where: { listId: dto.targetListId },
      orderBy: { position: 'asc' },
      include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
    });

    return {
      sourceListId,
      targetListId: dto.targetListId,
      sourceCards,
      targetCards,
    };
  }

  async addComment(cardId: number, dto: AddCommentDto) {
    const card = await this.prisma.client.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');

    return this.prisma.client.comment.create({
      data: {
        cardId,
        text: dto.text,
        author: dto.author || 'Anonymous',
      },
    });
  }

  async removeComment(cardId: number, commentId: number) {
    const comment = await this.prisma.client.comment.findFirst({
      where: { id: commentId, cardId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.client.comment.delete({ where: { id: commentId } });
    return { message: 'Comment deleted' };
  }

  async addLabel(cardId: number, dto: AddLabelDto) {
    const card = await this.prisma.client.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');

    return this.prisma.client.label.create({
      data: {
        cardId,
        color: dto.color || '',
        text: dto.text || '',
      },
    });
  }

  async removeLabel(cardId: number, labelId: number) {
    const label = await this.prisma.client.label.findFirst({
      where: { id: labelId, cardId },
    });
    if (!label) throw new NotFoundException('Label not found');

    await this.prisma.client.label.delete({ where: { id: labelId } });
    return { message: 'Label removed' };
  }

  async setDueDate(cardId: number, dto: SetDueDateDto) {
    const card = await this.prisma.client.card.findUnique({ where: { id: cardId } });
    if (!card) throw new NotFoundException('Card not found');

    return this.prisma.client.card.update({
      where: { id: cardId },
      data: { dueDate: dto.dueDate || null },
      include: { comments: { orderBy: { createdAt: 'asc' } }, labels: true },
    });
  }

  private async renumberList(listId: number) {
    const cards = await this.prisma.client.card.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    });
    for (let i = 0; i < cards.length; i++) {
      await this.prisma.client.card.update({
        where: { id: cards[i].id },
        data: { position: i },
      });
    }
  }
}
