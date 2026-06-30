import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ListService } from './list.service';
import { PrismaService } from '../prisma/prisma.service';
import { TrelloGateway } from '../common/gateways/trello.gateway';

function createMockPrisma() {
  return {
    client: {
      list: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    },
  };
}

describe('ListService.reorder()', () => {
  let service: ListService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockPrisma.client.list.update.mockReturnValue(Promise.resolve({}));
    mockPrisma.client.$transaction.mockImplementation(
      async (updates: Promise<any>[]) => Promise.all(updates),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: TrelloGateway,
          useValue: {
            emitListCreated: jest.fn(),
            emitListUpdated: jest.fn(),
            emitListDeleted: jest.fn(),
            emitListReordered: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ListService>(ListService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('Successful reorder', () => {
    it('should move list from index 2 to index 0 within same board', async () => {
      mockPrisma.client.list.findUnique
        .mockResolvedValueOnce({ id: 3, boardId: 100 }) // src
        .mockResolvedValueOnce({ id: 1, boardId: 100 }); // tgt

      mockPrisma.client.list.findMany.mockResolvedValue([
        { id: 1, boardId: 100, order: 0 },
        { id: 2, boardId: 100, order: 1 },
        { id: 3, boardId: 100, order: 2 },
      ]);

      await service.reorder(3, { targetListId: 1 });

      // renumber-all: $transaction được gọi 1 lần với 3 updates
      expect(mockPrisma.client.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.client.list.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.client.list.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { order: 0 },
      });
      expect(mockPrisma.client.list.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { order: 1 },
      });
      expect(mockPrisma.client.list.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { order: 2 },
      });
    });

    it('should move list from index 0 to index 2 within same board', async () => {
      mockPrisma.client.list.findUnique
        .mockResolvedValueOnce({ id: 1, boardId: 100 })
        .mockResolvedValueOnce({ id: 3, boardId: 100 });

      mockPrisma.client.list.findMany.mockResolvedValue([
        { id: 1, boardId: 100, order: 0 },
        { id: 2, boardId: 100, order: 1 },
        { id: 3, boardId: 100, order: 2 },
      ]);

      await service.reorder(1, { targetListId: 3 });

      // renumber-all: $transaction được gọi 1 lần với 3 updates
      expect(mockPrisma.client.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.client.list.update).toHaveBeenCalledTimes(3);
      expect(mockPrisma.client.list.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { order: 0 },
      });
      expect(mockPrisma.client.list.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { order: 1 },
      });
      expect(mockPrisma.client.list.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { order: 2 },
      });
    });

    it('should return the reordered lists from the board', async () => {
      const reordered = [
        { id: 3, boardId: 100, order: -1 },
        { id: 1, boardId: 100, order: 0 },
        { id: 2, boardId: 100, order: 1 },
      ];

      mockPrisma.client.list.findUnique
        .mockResolvedValueOnce({ id: 3, boardId: 100 })
        .mockResolvedValueOnce({ id: 1, boardId: 100 });

      mockPrisma.client.list.findMany
        .mockResolvedValueOnce([
          { id: 1, boardId: 100, order: 0 },
          { id: 2, boardId: 100, order: 1 },
          { id: 3, boardId: 100, order: 2 },
        ])
        .mockResolvedValueOnce(reordered);

      const result = await service.reorder(3, { targetListId: 1 });

      expect(result).toEqual(reordered);
      expect(mockPrisma.client.list.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling', () => {
    it('should throw BadRequestException when source list does not exist', async () => {
      mockPrisma.client.list.findUnique.mockResolvedValueOnce(null);

      await expect(service.reorder(999, { targetListId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when lists are in different boards', async () => {
      mockPrisma.client.list.findUnique
        .mockResolvedValueOnce({ id: 1, boardId: 100 })
        .mockResolvedValueOnce({ id: 2, boardId: 200 });

      await expect(service.reorder(1, { targetListId: 2 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
