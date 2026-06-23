import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CardService } from './card.service';
import { PrismaService } from '../prisma/prisma.service';

const mockCard = { id: 1, listId: 10, title: 'Test', description: '', position: 1, dueDate: null, createdAt: new Date() };
const mockOtherCard = { id: 2, listId: 10, title: 'Other', description: '', position: 2, dueDate: null, createdAt: new Date() };
const mockTargetList = { id: 20, boardId: 100, name: 'Target', order: 1 };

function createMockPrisma() {
  const mockTxCard = {
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const client = {
    card: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    list: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  return { client, mockTxCard };
}

describe('CardService.move()', () => {
  let service: CardService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    mockPrisma.client.$transaction.mockImplementation(async (cb: Function) => cb({ card: mockPrisma.mockTxCard }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CardService>(CardService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Same-list move', () => {
    it('should renumber cards after moving within same list', async () => {
      mockPrisma.client.card.findUnique.mockResolvedValue(mockCard);
      mockPrisma.client.list.findUnique.mockResolvedValue(mockTargetList);
      mockPrisma.mockTxCard.findMany.mockResolvedValue([
        { ...mockCard, position: 0 },
        { ...mockOtherCard, position: 1 },
        { id: 3, listId: 10, position: 2 },
      ]);
      const renumbered = [
        { ...mockOtherCard, position: 0 },
        { id: 3, listId: 10, position: 1 },
        { ...mockCard, position: 2 },
      ];
      mockPrisma.client.card.findMany.mockResolvedValue(renumbered);

      const result = await service.move(1, { targetListId: 10, targetPosition: 2 });

      expect(result).toEqual({
        sourceListId: 10,
        targetListId: 10,
        sourceCards: renumbered,
        targetCards: renumbered,
      });

      expect(mockPrisma.mockTxCard.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(1, {
        where: { id: 2 }, data: { position: 0 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(2, {
        where: { id: 3 }, data: { position: 1 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(3, {
        where: { id: 1 }, data: { position: 2 },
      });
    });

    it('should handle move to position 0 within same list', async () => {
      mockPrisma.client.card.findUnique.mockResolvedValue(mockCard);
      mockPrisma.client.list.findUnique.mockResolvedValue(mockTargetList);
      mockPrisma.mockTxCard.findMany.mockResolvedValue([
        { id: 1, listId: 10, position: 0 },
        { id: 2, listId: 10, position: 1 },
        { id: 3, listId: 10, position: 2 },
      ]);
      const renumbered = [
        { id: 2, listId: 10, position: 0 },
        { id: 3, listId: 10, position: 1 },
        { id: 1, listId: 10, position: 2 },
      ];
      mockPrisma.client.card.findMany.mockResolvedValue(renumbered);

      const result = await service.move(1, { targetListId: 10, targetPosition: 2 });

      expect(result.sourceListId).toBe(10);
      expect(result.targetListId).toBe(10);
      expect(result.sourceCards).toHaveLength(3);
      expect(result.targetCards).toHaveLength(3);

      expect(mockPrisma.mockTxCard.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(1, {
        where: { id: 2 }, data: { position: 0 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(2, {
        where: { id: 3 }, data: { position: 1 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(3, {
        where: { id: 1 }, data: { position: 2 },
      });
    });
  });

  describe('Cross-list move', () => {
    const crossCard = { ...mockCard, listId: 10 };
    const listA = { id: 10, boardId: 100 };
    const listB = { id: 20, boardId: 100 };

    it('should remove from source, insert at targetPosition, and renumber both lists', async () => {
      mockPrisma.client.card.findUnique.mockResolvedValue(crossCard);
      mockPrisma.client.list.findUnique.mockResolvedValue(listB);
      mockPrisma.mockTxCard.findMany
        .mockResolvedValueOnce([
          { id: 2, listId: 10, position: 0 },
          { id: 1, listId: 10, position: 1 },
        ])
        .mockResolvedValueOnce([
          { id: 3, listId: 20, position: 0 },
          { id: 4, listId: 20, position: 1 },
        ]);
      mockPrisma.client.card.findMany
        .mockResolvedValueOnce([
          { id: 2, listId: 10, position: 0 },
        ])
        .mockResolvedValueOnce([
          { id: 3, listId: 20, position: 0 },
          { id: 1, listId: 20, position: 1 },
          { id: 4, listId: 20, position: 2 },
        ]);

      const result = await service.move(1, { targetListId: 20, targetPosition: 1 });

      expect(result).toEqual({
        sourceListId: 10,
        targetListId: 20,
        sourceCards: [
          { id: 2, listId: 10, position: 0 },
        ],
        targetCards: [
          { id: 3, listId: 20, position: 0 },
          { id: 1, listId: 20, position: 1 },
          { id: 4, listId: 20, position: 2 },
        ],
      });

      expect(mockPrisma.mockTxCard.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.mockTxCard.findMany).toHaveBeenNthCalledWith(1, {
        where: { listId: 10 }, orderBy: { position: 'asc' },
      });
      expect(mockPrisma.mockTxCard.findMany).toHaveBeenNthCalledWith(2, {
        where: { listId: 20 }, orderBy: { position: 'asc' },
      });

      expect(mockPrisma.mockTxCard.update).toHaveBeenCalledTimes(4);
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(1, {
        where: { id: 2 }, data: { position: 0 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(2, {
        where: { id: 3 }, data: { listId: 20, position: 0 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(3, {
        where: { id: 1 }, data: { listId: 20, position: 1 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(4, {
        where: { id: 4 }, data: { listId: 20, position: 2 },
      });
    });

    it('should append at end when targetPosition exceeds array length', async () => {
      mockPrisma.client.card.findUnique.mockResolvedValue(crossCard);
      mockPrisma.client.list.findUnique.mockResolvedValue(listB);
      mockPrisma.mockTxCard.findMany
        .mockResolvedValueOnce([
          { id: 2, listId: 10, position: 0 },
        ])
        .mockResolvedValueOnce([
          { id: 3, listId: 20, position: 0 },
        ]);
      mockPrisma.client.card.findMany
        .mockResolvedValueOnce([
          { id: 2, listId: 10, position: 0 },
        ])
        .mockResolvedValueOnce([
          { id: 3, listId: 20, position: 0 },
          { id: 1, listId: 20, position: 1 },
        ]);

      const result = await service.move(1, { targetListId: 20, targetPosition: 5 });

      expect(result).toEqual({
        sourceListId: 10,
        targetListId: 20,
        sourceCards: [
          { id: 2, listId: 10, position: 0 },
        ],
        targetCards: [
          { id: 3, listId: 20, position: 0 },
          { id: 1, listId: 20, position: 1 },
        ],
      });

      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(2, {
        where: { id: 3 }, data: { listId: 20, position: 0 },
      });
      expect(mockPrisma.mockTxCard.update).toHaveBeenNthCalledWith(3, {
        where: { id: 1 }, data: { listId: 20, position: 1 },
      });
    });
  });

  describe('Error handling', () => {
    it('should throw NotFoundException when card does not exist', async () => {
      mockPrisma.client.card.findUnique.mockResolvedValue(null);

      await expect(
        service.move(999, { targetListId: 20, targetPosition: 0 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when target list does not exist', async () => {
      mockPrisma.client.card.findUnique.mockResolvedValue(mockCard);
      mockPrisma.client.list.findUnique.mockResolvedValue(null);

      await expect(
        service.move(1, { targetListId: 999, targetPosition: 0 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
