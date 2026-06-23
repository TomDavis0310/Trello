import { describe, it, expect, beforeEach, vi } from 'vitest';
import useBoardStore from './boardStore';

vi.mock('../services/api', () => ({
  api: {
    moveCard: vi.fn(),
    reorderList: vi.fn(),
    getBoard: vi.fn(),
    getBoards: vi.fn(),
  },
}));

import { api } from '../services/api';

const resetStore = () =>
  useBoardStore.setState({
    boards: [],
    currentBoard: null,
    lists: [],
    cards: [],
    activeCardId: null,
    isLoading: false,
    isMoving: false,
    error: null,
  });

const sampleCards = () => [
  { id: 1, listId: 10, title: 'A', position: 0, comments: [], labels: [] },
  { id: 2, listId: 10, title: 'B', position: 1, comments: [], labels: [] },
  { id: 3, listId: 10, title: 'C', position: 2, comments: [], labels: [] },
  { id: 4, listId: 20, title: 'D', position: 0, comments: [], labels: [] },
  { id: 5, listId: 20, title: 'E', position: 1, comments: [], labels: [] },
];

const sampleLists = () => [
  { id: 10, boardId: 100, name: 'List A', order: 0 },
  { id: 20, boardId: 100, name: 'List B', order: 1 },
  { id: 30, boardId: 100, name: 'List C', order: 2 },
];

describe('boardStore — isMoving lock', () => {
  beforeEach(resetStore);

  it('should block second moveCard while first is in-flight', async () => {
    let deferredResolve;
    const deferred = new Promise((r) => { deferredResolve = r; });
    vi.mocked(api.moveCard).mockReturnValue(deferred);

    useBoardStore.setState({ cards: sampleCards() });

    const p1 = useBoardStore.getState().moveCard(1, 20, 0);

    expect(useBoardStore.getState().isMoving).toBe(true);

    const p2 = useBoardStore.getState().moveCard(2, 20, 1);

    deferredResolve({
      sourceListId: 10,
      targetListId: 20,
      sourceCards: sampleCards()
        .filter((c) => c.listId === 10 && c.id !== 1)
        .map((c, i) => ({ ...c, position: i })),
      targetCards: [
        { ...sampleCards().find((c) => c.id === 1), listId: 20, position: 0 },
        ...sampleCards()
          .filter((c) => c.listId === 20)
          .map((c, i) => ({ ...c, position: i + 1 })),
      ],
    });
    await p1;
    await p2;

    expect(useBoardStore.getState().isMoving).toBe(false);
    expect(api.moveCard).toHaveBeenCalledTimes(1);
  });

  it('should block second moveList while first is in-flight', async () => {
    let deferredResolve;
    const deferred = new Promise((r) => { deferredResolve = r; });
    vi.mocked(api.reorderList).mockReturnValue(deferred);

    useBoardStore.setState({ lists: sampleLists() });

    const p1 = useBoardStore.getState().moveList(10, 30);

    expect(useBoardStore.getState().isMoving).toBe(true);

    const p2 = useBoardStore.getState().moveList(20, 10);

    deferredResolve([
      { id: 30, boardId: 100, order: 0 },
      { id: 10, boardId: 100, order: 1 },
      { id: 20, boardId: 100, order: 2 },
    ]);
    await p1;
    await p2;

    expect(useBoardStore.getState().isMoving).toBe(false);
    expect(api.reorderList).toHaveBeenCalledTimes(1);
  });
});

describe('boardStore — rollback on error', () => {
  beforeEach(resetStore);

  it('should rollback cards state when moveCard API fails', async () => {
    vi.mocked(api.moveCard).mockRejectedValue(new Error('Network Error'));

    useBoardStore.setState({ cards: sampleCards() });

    const prevCards = useBoardStore.getState().cards;

    await useBoardStore.getState().moveCard(1, 20, 0);

    const state = useBoardStore.getState();
    expect(state.cards).toEqual(prevCards);
    expect(state.error).toBe('Network Error');
    expect(state.isMoving).toBe(false);
  });

  it('should rollback lists state when reorderList API fails', async () => {
    vi.mocked(api.reorderList).mockRejectedValue(new Error('Server Error'));

    useBoardStore.setState({ lists: sampleLists() });

    const prevLists = useBoardStore.getState().lists;

    await useBoardStore.getState().moveList(10, 30);

    const state = useBoardStore.getState();
    expect(state.lists).toEqual(prevLists);
    expect(state.error).toBe('Server Error');
    expect(state.isMoving).toBe(false);
  });

  it('should release lock after successful moveCard', async () => {
    const sourceCards = sampleCards()
      .filter((c) => c.listId === 10 && c.id !== 1)
      .map((c, i) => ({ ...c, position: i }));
    const targetCards = [
      { ...sampleCards().find((c) => c.id === 1), listId: 20, position: 0 },
      ...sampleCards()
        .filter((c) => c.listId === 20)
        .map((c, i) => ({ ...c, position: i + 1 })),
    ];
    vi.mocked(api.moveCard).mockResolvedValue({
      sourceListId: 10,
      targetListId: 20,
      sourceCards,
      targetCards,
    });

    useBoardStore.setState({ cards: sampleCards() });

    await useBoardStore.getState().moveCard(1, 20, 0);

    expect(useBoardStore.getState().isMoving).toBe(false);
    expect(useBoardStore.getState().error).toBeNull();
  });

  it('should release lock after successful moveList', async () => {
    vi.mocked(api.reorderList).mockResolvedValue([
      { id: 30, boardId: 100, order: 0 },
      { id: 10, boardId: 100, order: 1 },
      { id: 20, boardId: 100, order: 2 },
    ]);

    useBoardStore.setState({ lists: sampleLists() });

    await useBoardStore.getState().moveList(10, 30);

    expect(useBoardStore.getState().isMoving).toBe(false);
    expect(useBoardStore.getState().error).toBeNull();
  });
});

describe('boardStore — state sync from API response', () => {
  beforeEach(resetStore);

  it('should patch position and listId from moveCard response (cross-list)', async () => {
    const sourceCards = sampleCards()
      .filter((c) => c.listId === 10 && c.id !== 1)
      .map((c, i) => ({ ...c, position: i }));
    const targetCards = [
      { id: 1, listId: 20, title: 'A', position: 0, comments: [], labels: [] },
      { id: 4, listId: 20, title: 'D', position: 1, comments: [], labels: [] },
      { id: 5, listId: 20, title: 'E', position: 2, comments: [], labels: [] },
    ];
    vi.mocked(api.moveCard).mockResolvedValue({
      sourceListId: 10,
      targetListId: 20,
      sourceCards,
      targetCards,
    });

    useBoardStore.setState({ cards: sampleCards() });

    await useBoardStore.getState().moveCard(1, 20, 0);

    const cards = useBoardStore.getState().cards;

    // Moved card
    const moved = cards.find((c) => c.id === 1);
    expect(moved.position).toBe(0);
    expect(moved.listId).toBe(20);

    // Source list cards (renumbered)
    expect(cards.find((c) => c.id === 2).position).toBe(0);
    expect(cards.find((c) => c.id === 3).position).toBe(1);

    // Target list cards (renumbered)
    expect(cards.find((c) => c.id === 4).position).toBe(1);
    expect(cards.find((c) => c.id === 5).position).toBe(2);

    // Total count unchanged
    expect(cards.length).toBe(5);
  });

  it('should sync positions from moveCard response (same-list)', async () => {
    const renumbered = [
      { id: 2, listId: 10, title: 'B', position: 0, comments: [], labels: [] },
      { id: 3, listId: 10, title: 'C', position: 1, comments: [], labels: [] },
      { id: 1, listId: 10, title: 'A', position: 2, comments: [], labels: [] },
    ];
    vi.mocked(api.moveCard).mockResolvedValue({
      sourceListId: 10,
      targetListId: 10,
      sourceCards: renumbered,
      targetCards: renumbered,
    });

    useBoardStore.setState({ cards: sampleCards() });

    await useBoardStore.getState().moveCard(1, 10, 2);

    const cards = useBoardStore.getState().cards;

    // All three cards in list 10 were renumbered
    expect(cards.find((c) => c.id === 1).position).toBe(2);
    expect(cards.find((c) => c.id === 2).position).toBe(0);
    expect(cards.find((c) => c.id === 3).position).toBe(1);

    // List 20 cards are untouched
    expect(cards.find((c) => c.id === 4).position).toBe(0);
    expect(cards.find((c) => c.id === 5).position).toBe(1);

    // No duplicate cards (src/dst same list → only sourceCards used)
    expect(cards.length).toBe(5);
  });

  it('should use reorderList response to overwrite list orders', async () => {
    const reordered = [
      { id: 30, boardId: 100, order: 0 },
      { id: 10, boardId: 100, order: 1 },
      { id: 20, boardId: 100, order: 2 },
    ];
    vi.mocked(api.reorderList).mockResolvedValue(reordered);

    useBoardStore.setState({ lists: sampleLists() });

    await useBoardStore.getState().moveList(10, 30);

    const lists = useBoardStore.getState().lists;
    expect(lists.find((l) => l.id === 30).order).toBe(0);
    expect(lists.find((l) => l.id === 10).order).toBe(1);
    expect(lists.find((l) => l.id === 20).order).toBe(2);
  });
});
