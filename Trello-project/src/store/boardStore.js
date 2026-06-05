import { create } from "zustand";
import cloneDeep from "lodash/cloneDeep";
import { devtools } from "zustand/middleware";

// === Board Store (Zustand) ===
// Store trung tâm quản lý toàn bộ dữ liệu Trello: boards, lists, cards.
// Tất cả các thay đổi CRUD đều được persist vào localStorage (key `trello-data`).
// Mỗi action đều gọi `_persist()` sau khi mutate state để duy trì dữ liệu giữa các lần tải lại.

let nextId = 1;
const genId = () => nextId++;

// Danh sách cột mặc định khi tạo board mới
const DEFAULT_LISTS = ["Todo", "In Progress", "Review", "Done"];

const useBoardStore = create(
  devtools(
    (set, get) => ({
      // ============= STATE =============
      boards: [],
      currentBoard: null,
      lists: [],
      cards: [],
      activeCardId: null, // ID card đang mở modal chi tiết
      isLoading: false,
      error: null,

      // ============= PERSIST (Khởi tạo) =============
      // fetchBoards: đọc dữ liệu từ localStorage và khôi phục state.
      // Đồng thời thực hiện migrate: thêm `order` cho các list cũ chưa có.
      fetchBoards: async () => {
        set({ isLoading: true }, false, "fetchBoards/start");
        try {
          const saved = localStorage.getItem("trello-data");
          if (saved) {
            const data = JSON.parse(saved);
            nextId = data.nextId;

            // Migrate: gán order mặc định dựa vào vị trí trong mảng nếu thiếu
            const lists = data.lists || [];
            const boardIds = [...new Set(lists.map((l) => l.boardId))];
            boardIds.forEach((bid) => {
              const boardLists = lists.filter((l) => l.boardId === bid);
              boardLists.forEach((l, i) => {
                if (l.order === undefined) l.order = i;
              });
            });

            // Migrate: gán giá trị mặc định cho card cũ (từ phiên bản trước)
            // Khi thêm field mới (comments, labels, dueDate), card cũ trong localStorage
            // sẽ không có các field này → tự động gán giá trị mặc định để tránh lỗi
            //   - comments: mặc định []
            //   - labels: mặc định []
            //   - dueDate: mặc định null
            const cards = (data.cards || []).map((c) => ({
              ...c,
              comments: c.comments || [],
              labels: c.labels || [],
              dueDate: c.dueDate || null,
            }));

            set(
              {
                boards: data.boards,
                lists,
                cards,
                isLoading: false,
              },
              false,
              "fetchBoards/success",
            );
          } else {
            set({ isLoading: false });
          }
        } catch {
          set({ isLoading: false }, false, "fetchBoards/error");
        }
      },

      // _persist: ghi snapshot boards + lists + cards + nextId vào localStorage
      _persist: () => {
        const { boards, lists, cards } = get();
        localStorage.setItem(
          "trello-data",
          JSON.stringify({ nextId, boards, lists, cards }),
        );
      },

      setCurrentBoard: (board) =>
        set({ currentBoard: board }, false, "setCurrentBoard"),

      // ============= BOARD CRUD =============
      // Tạo board mới kèm 4 list mặc định (Todo, In Progress, Review, Done)
      createBoard: (name) => {
        const board = { id: genId(), name, createdAt: Date.now() };
        const defaultLists = DEFAULT_LISTS.map((name, i) => ({
          id: genId(),
          boardId: board.id,
          name,
          order: i,
        }));

        set(
          (state) => ({
            boards: [...state.boards, board],
            lists: [...state.lists, ...defaultLists],
          }),
          false,
          "createBoard",
        );
        get()._persist();
        
        return board;
      },

      // Cập nhật thông tin board (vd: đổi tên)
      updateBoard: (id, data) => {
        set(
          (state) => ({
            boards: state.boards.map((b) =>
              b.id === id ? { ...b, ...data } : b,
            ),
          }),
          false,
          "updateBoard",
        );
        get()._persist();
      },

      // Xóa board + toàn bộ list và card thuộc board đó
      deleteBoard: (id) => {
        set(
          (state) => ({
            boards: state.boards.filter((b) => b.id !== id),
            lists: state.lists.filter((l) => l.boardId !== id),
            cards: state.cards.filter((c) => {
              const list = get().lists.find((l) => l.id === c.listId);
              return list && list.boardId !== id;
            }),
          }),
          false,
          "deleteBoard",
        );
        get()._persist();
      },

      // ============= LIST CRUD =============
      // Tạo list mới trong board, đặt order = số lượng list hiện tại
      createList: (boardId, name) => {
        const boardLists = get().lists.filter((l) => l.boardId === boardId);
        const list = { id: genId(), boardId, name, order: boardLists.length };
        set(
          (state) => ({ lists: [...state.lists, list] }),
          false,
          "createList",
        );
        get()._persist();
        return list;
      },

      // Sắp xếp lại thứ tự list (dùng trong drag & drop list)
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
        set(
          { lists: lists.map((l) => updated.find((u) => u.id === l.id) || l) },
          false,
          "reorderList",
        );
        get()._persist();
      },

      // Cập nhật tên list
      updateList: (id, data) => {
        set(
          (state) => ({
            lists: state.lists.map((l) =>
              l.id === id ? { ...l, ...data } : l,
            ),
          }),
          false,
          "updateList",
        );
        get()._persist();
      },

      // Xóa list + toàn bộ card trong list đó
      deleteList: (id) => {
        set(
          (state) => ({
            lists: state.lists.filter((l) => l.id !== id),
            cards: state.cards.filter((c) => c.listId !== id),
          }),
          false,
          "deleteList",
        );
        get()._persist();
      },

      // ============= CARD CRUD =============
      // Tạo card mới trong list với đầy đủ fields:
      //   - id: tự sinh (genId)
      //   - listId: ID của list chứa card
      //   - title: tiêu đề
      //   - createdAt: timestamp
      //   - comments: mảng comment (mỗi comment: { id, text, author, createdAt })
      //   - labels: mảng label (mỗi label: { id, color, text })
      //   - dueDate: string ISO date hoặc null
      createCard: (listId, title) => {
        const card = {
          id: genId(),
          listId,
          title,
          createdAt: Date.now(),
          comments: [],
          labels: [],
          dueDate: null,
        };
        set(
          (state) => ({ cards: [...state.cards, card] }),
          false,
          "createCard",
        );
        get()._persist();
        return card;
      },

      updateCard: (id, data) => {
        set(
          (state) => ({
            cards: state.cards.map((c) =>
              c.id === id ? { ...c, ...data } : c,
            ),
          }),
          false,
          "updateCard",
        );
        get()._persist();
      },

      deleteCard: (id) => {
        set(
          (state) => ({ cards: state.cards.filter((c) => c.id !== id) }),
          false,
          "deleteCard",
        );
        get()._persist();
      },

      // Di chuyển card từ list này sang list khác (hoặc cùng list) tại vị trí chỉ định
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
        set({ cards: finalCards }, false, "moveCard");
        get()._persist();
      },

      // ============= COMMENT CRUD =============
      addComment: (cardId, text, author) => {
        const comment = {
          id: genId(),
          text,
          author,
          createdAt: Date.now(),
        };
        set(
          (state) => ({
            cards: state.cards.map((c) =>
              c.id === cardId
                ? { ...c, comments: [...(c.comments || []), comment] }
                : c,
            ),
          }),
          false,
          "addComment",
        );
        get()._persist();
        return comment;
      },

      deleteComment: (cardId, commentId) => {
        set(
          (state) => ({
            cards: state.cards.map((c) =>
              c.id === cardId
                ? {
                    ...c,
                    comments: (c.comments || []).filter(
                      (cm) => cm.id !== commentId,
                    ),
                  }
                : c,
            ),
          }),
          false,
          "deleteComment",
        );
        get()._persist();
      },

      // ============= LABEL CRUD =============
      // Label là nhãn màu gắn vào card, mỗi label có:
      //   - id: tự sinh
      //   - color: mã hex (vd: "#61bd4f")
      //   - text: tên hiển thị (vd: "Urgent")
      //
      // addLabel: thêm label vào card (gán id tự động)
      // removeLabel: xóa label khỏi card theo labelId
      addLabel: (cardId, label) => {
        set(
          (state) => (
            {
              cards: state.cards.map((c) =>
                c.id === cardId
                  ? {
                      ...c,
                      labels: [...(c.labels || []), { id: genId(), ...label }],
                    }
                  : c,
              ),
            },
            false,
            "addLabel"
          ),
        );
        get()._persist();
      },

      removeLabel: (cardId, labelId) => {
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  labels: (c.labels || []).filter((l) => l.id !== labelId),
                }
              : c,
          ),
        }));
        get()._persist();
      },

      // ============= DUE DATE =============
      // setDueDate: đặt hoặc xóa ngày hết hạn của card
      //   - dateString: chuỗi ISO date (vd: "2026-06-10") hoặc null để xóa
      setDueDate: (cardId, dateString) => {
        set(
          (state) => (
            {
              cards: state.cards.map((c) =>
                c.id === cardId ? { ...c, dueDate: dateString } : c,
              ),
            },
            false,
            "setDueDate"
          ),
        );
        get()._persist();
      },

      // Xóa toàn bộ dữ liệu board (dùng khi logout để reset store)
      clearBoardData: () => {
        nextId = 1;
        set(
          {
            boards: [],
            lists: [],
            cards: [],
            currentBoard: null,
            activeCardId: null,
          },
          false,
          "clearBoardData",
        );
        get()._persist();
      },

      // ============= CARD MODAL =============
      openCardModal: (cardId) =>
        set({ activeCardId: cardId }, false, "openCardModal"),
      closeCardModal: () =>
        set({ activeCardId: null }, false, "closeCardModal"),

      // Cập nhật chi tiết card (dùng trong CardDetailModal), cloneDeep để giữ immutability
      updateCardDetail: (cardId, updatedData) => {
        const { cards } = get();
        const idx = cards.findIndex((c) => c.id === cardId);
        if (idx === -1) return;
        const next = cloneDeep(cards);
        next[idx] = { ...next[idx], ...updatedData };
        set({ cards: next }, false, "updateCardDetail");
        get()._persist();
      },
    }),
    {
      name: "BoardStore",
      trace: true,
      traceLimit: 25,
    },
  ),
);

export default useBoardStore;
