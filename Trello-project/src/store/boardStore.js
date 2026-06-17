import { create } from "zustand";
import cloneDeep from "lodash/cloneDeep";
import { devtools } from "zustand/middleware";
import { api } from "../services/api";

const useBoardStore = create(
  devtools(
    (set, get) => ({
      boards: [],
      currentBoard: null,
      lists: [],
      cards: [],
      activeCardId: null,
      isLoading: false,
      error: null,

      fetchBoards: async () => {
        set({ isLoading: true }, false, "fetchBoards/start");
        try {
          const data = await api.getData();
          if (data) {
            set(
              {
                boards: data.boards || [],
                lists: data.lists || [],
                cards: data.cards || [],
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

      setCurrentBoard: (board) =>
        set({ currentBoard: board }, false, "setCurrentBoard"),

      createBoard: async (name) => {
        try {
          const board = await api.createBoard(name);
          set(
            (state) => ({
              boards: [...state.boards, board],
            }),
            false,
            "createBoard",
          );
          await get().fetchBoards();
          return board;
        } catch (err) {
          set({ error: err.message }, false, "createBoard/error");
        }
      },

      updateBoard: async (id, data) => {
        try {
          const updated = await api.updateBoard(id, data);
          set(
            (state) => ({
              boards: state.boards.map((b) =>
                b.id === id ? { ...b, ...updated } : b,
              ),
            }),
            false,
            "updateBoard",
          );
        } catch (err) {
          set({ error: err.message }, false, "updateBoard/error");
        }
      },

      deleteBoard: async (id) => {
        try {
          await api.deleteBoard(id);
          const { boards, lists, cards, currentBoard } = get();
          const remainingLists = lists.filter((l) => Number(l.boardId) !== Number(id));
          const remainingListIds = new Set(remainingLists.map((l) => l.id));
          set(
            {
              boards: boards.filter((b) => b.id !== id),
              lists: remainingLists,
              cards: cards.filter((c) => remainingListIds.has(c.listId)),
              currentBoard: currentBoard?.id === id ? null : currentBoard,
            },
            false,
            "deleteBoard",
          );
        } catch (err) {
          set({ error: err.message }, false, "deleteBoard/error");
        }
      },

      createList: async (boardId, name) => {
        try {
          const list = await api.createList(boardId, name);
          set(
            (state) => ({ lists: [...state.lists, list] }),
            false,
            "createList",
          );
          return list;
        } catch (err) {
          set({ error: err.message }, false, "createList/error");
        }
      },

      moveList: async (activeId, overId) => {
        const { lists } = get();
        const prevLists = [...lists];

        const activeNum = Number(activeId);
        const overNum = Number(overId);

        const movedList = lists.find((l) => Number(l.id) === activeNum);
        if (!movedList) return;
        const bid = Number(movedList.boardId);

        const boardLists = lists
          .filter((l) => Number(l.boardId) === bid)
          .sort(
            (a, b) =>
              (a.position ?? a.order ?? 0) - (b.position ?? b.order ?? 0),
          );
        const otherLists = lists.filter((l) => Number(l.boardId) !== bid);

        const oldIndex = boardLists.findIndex(
          (l) => Number(l.id) === activeNum,
        );
        const newIndex = boardLists.findIndex(
          (l) => Number(l.id) === overNum,
        );
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
          return;

        const reordered = [...boardLists];
        const [removed] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, removed);

        const updated = reordered.map((list, i) => ({
          ...list,
          position: i,
          order: i,
        }));

        set(
          { lists: [...otherLists, ...updated] },
          false,
          "moveList/optimistic",
        );

        try {
          await api.reorderList(activeNum, overNum);
        } catch (err) {
          console.error("moveList error:", err);
          set(
            { lists: prevLists, error: err.message },
            false,
            "moveList/rollback",
          );
        }
      },

      updateList: async (id, data) => {
        try {
          await api.updateList(id, data);
          set(
            (state) => ({
              lists: state.lists.map((l) =>
                l.id === id ? { ...l, ...data } : l,
              ),
            }),
            false,
            "updateList",
          );
        } catch (err) {
          set({ error: err.message }, false, "updateList/error");
        }
      },

      deleteList: async (id) => {
        try {
          await api.deleteList(id);
          set(
            (state) => ({
              lists: state.lists.filter((l) => l.id !== id),
              cards: state.cards.filter((c) => c.listId !== id),
            }),
            false,
            "deleteList",
          );
        } catch (err) {
          set({ error: err.message }, false, "deleteList/error");
        }
      },

      createCard: async (listId, title) => {
        try {
          const card = await api.createCard(listId, title);
          set(
            (state) => ({ cards: [...state.cards, card] }),
            false,
            "createCard",
          );
          return card;
        } catch (err) {
          set({ error: err.message }, false, "createCard/error");
        }
      },

      updateCard: async (id, data) => {
        try {
          await api.updateCard(id, data);
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                c.id === id ? { ...c, ...data } : c,
              ),
            }),
            false,
            "updateCard",
          );
        } catch (err) {
          set({ error: err.message }, false, "updateCard/error");
        }
      },

      deleteCard: async (id) => {
        try {
          await api.deleteCard(id);
          set(
            (state) => ({
              cards: state.cards.filter((c) => c.id !== id),
            }),
            false,
            "deleteCard",
          );
        } catch (err) {
          set({ error: err.message }, false, "deleteCard/error");
        }
      },

      moveCard: async (cardId, targetListId, targetIndex) => {
        const prevCards = get().cards;
        const cid = Number(cardId);
        const tlid = Number(targetListId);
        const card = prevCards.find((c) => Number(c.id) === cid);
        if (!card) return;

        const updatedCard = { ...card, listId: tlid };
        const otherCards = prevCards.filter((c) => Number(c.id) !== cid);

        const targetListCards = otherCards
          .filter((c) => Number(c.listId) === tlid)
          .reduce((acc, c) => { acc.push(c); return acc; }, []);
        targetListCards.splice(targetIndex, 0, updatedCard);

        const restCards = otherCards.filter(
          (c) => Number(c.listId) !== tlid,
        );

        set(
          { cards: [...restCards, ...targetListCards] },
          false,
          "moveCard/optimistic",
        );

        try {
          await api.moveCard(cid, tlid);
        } catch (err) {
          console.error("moveCard error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "moveCard/rollback",
          );
        }
      },

      addComment: async (cardId, text, author) => {
        try {
          const comment = await api.addComment(cardId, text, author);
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
          return comment;
        } catch (err) {
          set({ error: err.message }, false, "addComment/error");
        }
      },

      deleteComment: async (cardId, commentId) => {
        try {
          await api.deleteComment(cardId, commentId);
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
        } catch (err) {
          set({ error: err.message }, false, "deleteComment/error");
        }
      },

      addLabel: async (cardId, label) => {
        try {
          const newLabel = await api.addLabel(cardId, label.color, label.text);
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                c.id === cardId
                  ? { ...c, labels: [...(c.labels || []), newLabel] }
                  : c,
              ),
            }),
            false,
            "addLabel",
          );
        } catch (err) {
          set({ error: err.message }, false, "addLabel/error");
        }
      },

      removeLabel: async (cardId, labelId) => {
        try {
          await api.removeLabel(cardId, labelId);
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                c.id === cardId
                  ? {
                      ...c,
                      labels: (c.labels || []).filter((l) => l.id !== labelId),
                    }
                  : c,
              ),
            }),
            false,
            "removeLabel",
          );
        } catch (err) {
          set({ error: err.message }, false, "removeLabel/error");
        }
      },

      setDueDate: async (cardId, dateString) => {
        try {
          await api.setDueDate(cardId, dateString);
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                c.id === cardId ? { ...c, dueDate: dateString } : c,
              ),
            }),
            false,
            "setDueDate",
          );
        } catch (err) {
          set({ error: err.message }, false, "setDueDate/error");
        }
      },

      clearBoardData: () => {
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
      },

      openCardModal: (cardId) =>
        set({ activeCardId: cardId }, false, "openCardModal"),
      closeCardModal: () =>
        set({ activeCardId: null }, false, "closeCardModal"),

      updateCardDetail: async (cardId, updatedData) => {
        try {
          await api.updateCard(cardId, updatedData);
          const { cards } = get();
          const idx = cards.findIndex((c) => c.id === cardId);
          if (idx === -1) return;
          const next = cloneDeep(cards);
          next[idx] = { ...next[idx], ...updatedData };
          set({ cards: next }, false, "updateCardDetail");
        } catch (err) {
          set({ error: err.message }, false, "updateCardDetail/error");
        }
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
