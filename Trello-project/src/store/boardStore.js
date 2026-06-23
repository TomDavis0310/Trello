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
      isMoving: false,
      error: null,

      fetchBoards: async () => {
        set({ isLoading: true }, false, "fetchBoards/start");
        try {
          const boards = await api.getBoards();
          set({ boards: boards || [], isLoading: false }, false, "fetchBoards/success");
        } catch {
          set({ isLoading: false }, false, "fetchBoards/error");
        }
      },

      setCurrentBoard: async (board) => {
        const prev = get().currentBoard;
        if (!board) {
          set({ currentBoard: null, lists: [], cards: [] }, false, "setCurrentBoard/null");
          return;
        }
        set({ isLoading: true }, false, "setCurrentBoard/start");
        try {
          const full = await api.getBoard(board.id);
          const lists = (full.lists || []).map(({ cards, ...list }) => list);
          const cards = (full.lists || []).flatMap((l) => l.cards || []);
          set({ lists, cards, currentBoard: full, isLoading: false }, false, "setCurrentBoard/done");
        } catch (err) {
          console.error("Failed to load board:", err);
          set({ currentBoard: prev, isLoading: false, error: err.message }, false, "setCurrentBoard/rollback");
        }
      },

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
        if (get().isMoving) return;
        set({ isMoving: true }, false, "moveList/lock");

        const { lists } = get();
        const prevLists = [...lists];

        try {
          const activeNum = Number(activeId);
          const overNum = Number(overId);

          const movedList = lists.find((l) => Number(l.id) === activeNum);
          if (!movedList) return;

          const bid = Number(movedList.boardId);

          const boardLists = lists
            .filter((l) => Number(l.boardId) === bid)
            .sort(
              (a, b) =>
                (a.order ?? 0) - (b.order ?? 0),
            );
          const otherLists = lists.filter((l) => Number(l.boardId) !== bid);

          const oldIndex = boardLists.findIndex(
            (l) => Number(l.id) === activeNum,
          );
          const newIndex = boardLists.findIndex(
            (l) => Number(l.id) === overNum,
          );
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

          const reordered = [...boardLists];
          const [removed] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, removed);

          const updated = reordered.map((list, i) => ({
            ...list,
            order: i,
          }));

          set(
            { lists: [...otherLists, ...updated] },
            false,
            "moveList/optimistic",
          );

          const reorderedLists = await api.reorderList(activeNum, { targetListId: overNum });
          if (Array.isArray(reorderedLists)) {
            // API trả về toàn bộ List của board hiện tại, đã sort theo order
            // Ghi đè hoàn toàn, giữ nguyên list của board khác
            set(
              {
                lists: [
                  ...lists.filter((l) => Number(l.boardId) !== bid),
                  ...reorderedLists,
                ],
              },
              false,
              "moveList/success",
            );
          } else if (reorderedLists) {
            console.log("Format API reorderList thực tế:", reorderedLists);
          }
        } catch (err) {
          console.error("moveList error:", err);
          set(
            { lists: prevLists, error: err.message },
            false,
            "moveList/rollback",
          );
        } finally {
          set({ isMoving: false }, false, "moveList/unlock");
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
        if (get().isMoving) return;
        set({ isMoving: true }, false, "moveCard/lock");

        const prevCards = get().cards;

        try {
          // 1. Optimistic update: dịch chuyển tạm trên giao diện
          const cid = String(cardId);
          const tlid = String(targetListId);

          const card = prevCards.find((c) => String(c.id) === cid);
          if (!card) return;

          const updatedCard = { ...card, listId: targetListId };
          const otherCards = prevCards.filter((c) => String(c.id) !== cid);

          const targetListCards = otherCards
            .filter((c) => String(c.listId) === tlid)
            .reduce((acc, c) => { acc.push(c); return acc; }, []);
          targetListCards.splice(targetIndex, 0, updatedCard);

          const restCards = otherCards.filter(
            (c) => String(c.listId) !== tlid,
          );

          set(
            { cards: [...restCards, ...targetListCards] },
            false,
            "moveCard/optimistic",
          );

          // 2. Gọi API
          const res = await api.moveCard(Number(cid), {
            targetListId: Number(tlid),
            targetPosition: targetIndex,
          });

          // 3. API THÀNH CÔNG: đồng bộ state từ response
          set(
            (state) => {
              if (res && typeof res === "object") {
                if (Array.isArray(res.sourceCards)) {
                  // Format: { sourceListId, targetListId, sourceCards, targetCards }
                  const srcId = String(res.sourceListId);
                  const tgtId = String(res.targetListId);
                  const idsToReplace = new Set([srcId, tgtId]);
                  const otherCards = state.cards.filter(
                    (c) => !idsToReplace.has(String(c.listId)),
                  );
                  return {
                    cards: [
                      ...otherCards,
                      ...res.sourceCards,
                      ...(srcId !== tgtId ? res.targetCards : []),
                    ],
                  };
                }

                if ("id" in res && "listId" in res && "position" in res) {
                  // Format: single card object — update cục bộ
                  const updatedId = String(res.id);
                  return {
                    cards: state.cards.map((c) =>
                      String(c.id) === updatedId ? { ...c, ...res } : c,
                    ),
                  };
                }
              }

              // Format không xác định — log và giữ nguyên optimistic state
              console.log("moveCard: format response không xác định:", res);
              const updatedCard = state.cards.find((c) => String(c.id) === cid);
              if (updatedCard) {
                return {
                  cards: state.cards.map((c) =>
                    String(c.id) === cid
                      ? { ...c, listId: targetListId }
                      : c,
                  ),
                };
              }
              return state;
            },
            false,
            "moveCard/success",
          );
        } catch (err) {
          console.error("moveCard error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "moveCard/rollback",
          );
        } finally {
          set({ isMoving: false }, false, "moveCard/unlock");
        }
      },

      addComment: async (cardId, text, author) => {
        const prevCards = get().cards;
        const tempId = `temp_${Date.now()}`;
        const tempComment = { id: tempId, cardId, text, author: author || "Anonymous" };

        set(
          (state) => ({
            cards: state.cards.map((c) =>
              c.id === cardId
                ? { ...c, comments: [...(c.comments || []), tempComment] }
                : c,
            ),
          }),
          false,
          "addComment/optimistic",
        );

        try {
          const realComment = await api.addComment(cardId, text, author);
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                c.id === cardId
                  ? {
                      ...c,
                      comments: (c.comments || []).map((cm) =>
                        cm.id === tempId ? realComment : cm,
                      ),
                    }
                  : c,
              ),
            }),
            false,
            "addComment/success",
          );
          return realComment;
        } catch (err) {
          console.error("addComment error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "addComment/rollback",
          );
        }
      },

      deleteComment: async (cardId, commentId) => {
        const prevCards = get().cards;

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
          "deleteComment/optimistic",
        );

        try {
          await api.deleteComment(cardId, commentId);
        } catch (err) {
          console.error("deleteComment error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "deleteComment/rollback",
          );
        }
      },

      addLabel: async (cardId, label) => {
        const prevCards = get().cards;
        const tempId = `temp_${Date.now()}`;
        const tempLabel = { id: tempId, cardId, color: label.color || "", text: label.text || "" };

        set(
          (state) => ({
            cards: state.cards.map((c) =>
              c.id === cardId
                ? { ...c, labels: [...(c.labels || []), tempLabel] }
                : c,
            ),
          }),
          false,
          "addLabel/optimistic",
        );

        try {
          const realLabel = await api.addLabel(cardId, label);
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                c.id === cardId
                  ? {
                      ...c,
                      labels: (c.labels || []).map((l) =>
                        l.id === tempId ? realLabel : l,
                      ),
                    }
                  : c,
              ),
            }),
            false,
            "addLabel/success",
          );
          return realLabel;
        } catch (err) {
          console.error("addLabel error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "addLabel/rollback",
          );
        }
      },

      removeLabel: async (cardId, labelId) => {
        const prevCards = get().cards;

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
          "removeLabel/optimistic",
        );

        try {
          await api.removeLabel(cardId, labelId);
        } catch (err) {
          console.error("removeLabel error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "removeLabel/rollback",
          );
        }
      },

      setDueDate: async (cardId, dateString) => {
        const prevCards = get().cards;

        set(
          (state) => ({
            cards: state.cards.map((c) =>
              c.id === cardId ? { ...c, dueDate: dateString } : c,
            ),
          }),
          false,
          "setDueDate/optimistic",
        );

        try {
          await api.setDueDate(cardId, { dueDate: dateString });
        } catch (err) {
          console.error("setDueDate error:", err);
          set(
            { cards: prevCards, error: err.message },
            false,
            "setDueDate/rollback",
          );
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
