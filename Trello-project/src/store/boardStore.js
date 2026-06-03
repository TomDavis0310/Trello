import { create } from "zustand";
import cloneDeep from "lodash/cloneDeep";

// Board store: lưu boards, lists, cards và thực hiện CRUD + persist.
// Cơ chế persist đơn giản dùng localStorage key `trello-data`.
let nextId = 1;
const genId = () => nextId++;

const DEFAULT_LISTS = ["Todo", "In Progress", "Review", "Done"];

const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoard: null,
  lists: [],
  cards: [],
  // activeCardId giữ id của card đang mở modal chi tiết
  activeCardId: null,
  isLoading: false,
  error: null,

  // Đọc dữ liệu đã persist (gọi khi khởi tạo app)
  fetchBoards: async () => {
    set({ isLoading: true });
    try {
      const saved = localStorage.getItem("trello-data");
      if (saved) {
        const data = JSON.parse(saved);
        nextId = data.nextId;

        // Migrate lists without order field
        const lists = data.lists || [];
        const boardIds = [...new Set(lists.map((l) => l.boardId))];
        boardIds.forEach((bid) => {
          const boardLists = lists.filter((l) => l.boardId === bid);
          boardLists.forEach((l, i) => {
            if (l.order === undefined) l.order = i;
          });
        });

        set({
          boards: data.boards,
          lists,
          cards: data.cards,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  // Hàm nội bộ _persist: ghi snapshot state vào localStorage
  _persist: () => {
    const { boards, lists, cards } = get();
    localStorage.setItem(
      "trello-data",
      JSON.stringify({ nextId, boards, lists, cards }),
    );
  },

  setCurrentBoard: (board) => set({ currentBoard: board }),

  /* Board CRUD */
  createBoard: (name) => {
    const board = { id: genId(), name, createdAt: Date.now() };
    const defaultLists = DEFAULT_LISTS.map((n, i) => ({
      id: genId(), boardId: board.id, name: n, order: i,
    }));
    set((state) => ({
      boards: [...state.boards, board],
      lists: [...state.lists, ...defaultLists],
    }));
    get()._persist();
    return board;
  },

  updateBoard: (id, data) => {
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }));
    get()._persist();
  },

  deleteBoard: (id) => {
    // remove board + its lists and cards
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      lists: state.lists.filter((l) => l.boardId !== id),
      cards: state.cards.filter((c) => {
        const list = get().lists.find((l) => l.id === c.listId);
        return list && list.boardId !== id;
      }),
    }));
    get()._persist();
  },

  /* List CRUD */
  createList: (boardId, name) => {
    const boardLists = get().lists.filter((l) => l.boardId === boardId);
    const list = { id: genId(), boardId, name, order: boardLists.length };
    set((state) => ({ lists: [...state.lists, list] }));
    get()._persist();
    return list;
  },

  reorderList: (listId, targetListId) => {
    const { lists } = get();
    const source = lists.find((l) => l.id === listId);
    const target = lists.find((l) => l.id === targetListId);
    if (!source || !target || source.boardId !== target.boardId) return;

    const boardLists = lists.filter((l) => l.boardId === source.boardId);
    const sorted = [...boardLists].sort((a, b) => a.order - b.order);
    const sourceIdx = sorted.findIndex((l) => l.id === listId);
    const targetIdx = sorted.findIndex((l) => l.id === targetListId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    sorted.splice(sourceIdx, 1);
    sorted.splice(targetIdx, 0, source);

    const updated = sorted.map((l, i) => ({ ...l, order: i }));
    set({ lists: lists.map((l) => updated.find((u) => u.id === l.id) || l) });
    get()._persist();
  },

  updateList: (id, data) => {
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }));
    get()._persist();
  },

  deleteList: (id) => {
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      cards: state.cards.filter((c) => c.listId !== id),
    }));
    get()._persist();
  },

  /* Card CRUD */
  createCard: (listId, title) => {
    const card = { id: genId(), listId, title, createdAt: Date.now() };
    set((state) => ({ cards: [...state.cards, card] }));
    get()._persist();
    return card;
  },

  updateCard: (id, data) => {
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    get()._persist();
  },

  deleteCard: (id) => {
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }));
    get()._persist();
  },

  // Di chuyển card giữa các list và tái cấu trúc lại mảng `cards`.
  moveCard: (cardId, targetListId, targetIndex) => {
    const { cards } = get();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const updatedCard = { ...card, listId: targetListId };
    const otherCards = cards.filter((c) => c.id !== cardId);
    const targetCards = otherCards.filter((c) => c.listId === targetListId);
    targetCards.splice(targetIndex, 0, updatedCard);
    const finalCards = [
      ...otherCards.filter((c) => c.listId !== targetListId),
      ...targetCards,
    ];
    set({ cards: finalCards });
    get()._persist();
  },

  // Clear all board-related data (used on logout)
  clearBoardData: () => {
    nextId = 1;
    set({
      boards: [],
      lists: [],
      cards: [],
      currentBoard: null,
      activeCardId: null,
    });
    get()._persist();
  },

  /* Card modal actions */
  openCardModal: (cardId) => set({ activeCardId: cardId }),
  closeCardModal: () => set({ activeCardId: null }),

  // updateCardDetail: cập nhật card bằng cloneDeep để giữ immutability
  updateCardDetail: (cardId, updatedData) => {
    const { cards } = get();
    const idx = cards.findIndex((c) => c.id === cardId);
    if (idx === -1) return;
    const next = cloneDeep(cards);
    next[idx] = { ...next[idx], ...updatedData };
    set({ cards: next });
    get()._persist();
  },
}));

export default useBoardStore;
