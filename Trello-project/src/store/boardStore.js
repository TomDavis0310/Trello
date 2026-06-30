import { create } from "zustand";
import cloneDeep from "lodash/cloneDeep";
import { devtools } from "zustand/middleware";
import { api } from "../services/api";
import { getSocket } from "../services/socket";

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
          const lists = (full.lists || []).map((l) => ({
  id: l.id,
  boardId: l.boardId,
  name: l.name,
  order: l.order,
}));
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
            (state) => {
              const exists = state.lists.some((l) => String(l.id) === String(list.id));
              if (exists) return state;
              return { lists: [...state.lists, list] };
            },
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
            (state) => {
              const exists = state.cards.some((c) => String(c.id) === String(card.id));
              if (exists) return state;
              return { cards: [...state.cards, card] };
            },
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
        console.log(`[moveCard] ENTER cardId=${cardId} targetListId=${targetListId} targetIndex=${targetIndex} isMoving=${get().isMoving}`);
        console.log("[T9 StoreMove]", { cardId, targetListId, targetIndex });
        if (get().isMoving) {
          console.log(`[moveCard] EXIT: isMoving lock prevents concurrent call`);
          return;
        }
        set({ isMoving: true }, false, "moveCard/lock");

        const prevCards = get().cards;

        const cid = String(cardId);
        const tlid = String(targetListId);

        try {
          // 1. Optimistic update: dịch chuyển tạm trên giao diện

          const card = prevCards.find((c) => String(c.id) === cid);
          if (!card) {
            console.log(`[moveCard] EXIT: card not found`);
            return;
          }

          const sourceListId = String(card.listId);
          const sourceCardsBefore = prevCards.filter((c) => String(c.listId) === sourceListId);
          const targetCardsBefore = prevCards.filter((c) => String(c.listId) === tlid);
          console.log("[T10 StoreBefore]", {
            sourceListId,
            sourceCards: sourceCardsBefore.map(c => c.id),
            targetCards: targetCardsBefore.map(c => c.id),
          });
          console.log(`[moveCard] sourceListId=${sourceListId} sourceCardsBefore=${sourceCardsBefore.length} targetCardsBefore=${targetCardsBefore.length}`);
          console.log(`[moveCard] sourceCardsBefore IDs: ${sourceCardsBefore.map(c => c.id)}`);
          console.log(`[moveCard] targetCardsBefore IDs: ${targetCardsBefore.map(c => c.id)}`);

          const updatedCard = { ...card, listId: targetListId };
          const otherCards = prevCards.filter((c) => String(c.id) !== cid);
          const byPosition = (a, b) => (a.position ?? 0) - (b.position ?? 0);
          const normalizePositions = (cards) =>
            cards.map((entry, index) => ({ ...entry, position: index }));
          const clampIndex = (index, length) =>
            Math.max(0, Math.min(index, length));

          let nextCards;

          if (sourceListId === tlid) {
            const reorderedListCards = otherCards
              .filter((c) => String(c.listId) === sourceListId)
              .sort(byPosition);

            reorderedListCards.splice(
              clampIndex(targetIndex, reorderedListCards.length),
              0,
              updatedCard,
            );

            const normalizedListCards = normalizePositions(reorderedListCards);
            const untouchedCards = otherCards.filter(
              (c) => String(c.listId) !== sourceListId,
            );

            nextCards = [...untouchedCards, ...normalizedListCards];
          } else {
            const nextSourceListCards = normalizePositions(
              otherCards
                .filter((c) => String(c.listId) === sourceListId)
                .sort(byPosition),
            );

            const nextTargetListCards = otherCards
              .filter((c) => String(c.listId) === tlid)
              .sort(byPosition);

            console.log(`[moveCard] nextTargetListCards BEFORE splice: length=${nextTargetListCards.length} IDs=${nextTargetListCards.map(c => c.id)}`);

            nextTargetListCards.splice(
              clampIndex(targetIndex, nextTargetListCards.length),
              0,
              updatedCard,
            );

            const normalizedTargetListCards = normalizePositions(nextTargetListCards);
            const untouchedCards = otherCards.filter((c) => {
              const listId = String(c.listId);
              return listId !== sourceListId && listId !== tlid;
            });

            nextCards = [
              ...untouchedCards,
              ...nextSourceListCards,
              ...normalizedTargetListCards,
            ];
          }

          console.log("[T11 StoreAfter]", {
            sourceCards: nextCards.filter(c => String(c.listId) === sourceListId).map(c => `${c.id}:${c.position}`),
            targetCards: nextCards.filter(c => String(c.listId) === String(targetListId)).map(c => `${c.id}:${c.position}`),
          });

          console.log(`[moveCard] optimistic nextCards count=${nextCards.length}`);
          set(
            { cards: nextCards },
            false,
            "moveCard/optimistic",
          );

          // 2. Gọi API
          console.log(`[moveCard] CALLING API moveCard cid=${Number(cid)} targetListId=${Number(tlid)} targetPosition=${targetIndex}`);
          const res = await api.moveCard(Number(cid), {
            targetListId: Number(tlid),
            targetPosition: targetIndex,
          });
          console.log(`[moveCard] API response:`, res);

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
          console.log(`[moveCard] FINISHED`);
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

      connectSocket() {
        const socket = getSocket();
        if (!socket) return;
        const s = get();

        socket.on("board:updated", (data) => {
          set(
            (state) => ({
              boards: state.boards.map((b) =>
                Number(b.id) === Number(data.id) ? { ...b, ...data } : b,
              ),
              currentBoard:
                state.currentBoard && Number(state.currentBoard.id) === Number(data.id)
                  ? { ...state.currentBoard, ...data }
                  : state.currentBoard,
            }),
            false,
            "socket/board:updated",
          );
        });

        socket.on("board:deleted", ({ id }) => {
          set(
            (state) => ({
              boards: state.boards.filter((b) => Number(b.id) !== Number(id)),
              lists: state.lists.filter((l) => Number(l.boardId) !== Number(id)),
              cards: state.cards.filter((c) => {
                const list = s.lists.find((l) => Number(l.id) === Number(c.listId));
                return list && Number(list.boardId) !== Number(id);
              }),
              currentBoard:
                state.currentBoard && Number(state.currentBoard.id) === Number(id)
                  ? null
                  : state.currentBoard,
            }),
            false,
            "socket/board:deleted",
          );
        });

        socket.on("list:created", (list) => {
          set((state) => {
            const exists = state.lists.some((l) => String(l.id) === String(list.id));
            if (exists) return state;
            return { lists: [...state.lists, list] };
          }, false, "socket/list:created");
        });

        socket.on("list:updated", (data) => {
          set(
            (state) => ({
              lists: state.lists.map((l) =>
                Number(l.id) === Number(data.id) ? { ...l, ...data } : l,
              ),
            }),
            false,
            "socket/list:updated",
          );
        });

        socket.on("list:deleted", ({ id }) => {
          set(
            (state) => ({
              lists: state.lists.filter((l) => Number(l.id) !== Number(id)),
              cards: state.cards.filter((c) => Number(c.listId) !== Number(id)),
            }),
            false,
            "socket/list:deleted",
          );
        });

        socket.on("list:reordered", (reorderedLists) => {
          if (!Array.isArray(reorderedLists) || reorderedLists.length === 0) return;
          const bid = Number(reorderedLists[0].boardId);
          set(
            (state) => ({
              lists: [
                ...state.lists.filter((l) => Number(l.boardId) !== bid),
                ...reorderedLists,
              ],
            }),
            false,
            "socket/list:reordered",
          );
        });

        socket.on("card:created", (card) => {
          set((state) => {
            const exists = state.cards.some((c) => String(c.id) === String(card.id));
            if (exists) return state;
            return { cards: [...state.cards, card] };
          }, false, "socket/card:created");
        });

        socket.on("card:updated", (data) => {
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                Number(c.id) === Number(data.id) ? { ...c, ...data } : c,
              ),
            }),
            false,
            "socket/card:updated",
          );
        });

        socket.on("card:deleted", ({ id }) => {
          set(
            (state) => ({
              cards: state.cards.filter((c) => Number(c.id) !== Number(id)),
            }),
            false,
            "socket/card:deleted",
          );
        });

        socket.on("card:moved", ({ sourceListId, targetListId, sourceCards, targetCards }) => {
          set(
            (state) => {
              const srcId = Number(sourceListId);
              const tgtId = Number(targetListId);
              const idsToReplace = new Set([srcId, tgtId]);
              const otherCards = state.cards.filter(
                (c) => !idsToReplace.has(Number(c.listId)),
              );
              return {
                cards: [
                  ...otherCards,
                  ...sourceCards,
                  ...(srcId !== tgtId ? targetCards : []),
                ],
              };
            },
            false,
            "socket/card:moved",
          );
        });

        socket.on("comment:added", (comment) => {
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                Number(c.id) === Number(comment.cardId)
                  ? { ...c, comments: [...(c.comments || []), comment] }
                  : c,
              ),
            }),
            false,
            "socket/comment:added",
          );
        });

        socket.on("comment:deleted", ({ id }) => {
          set(
            (state) => ({
              cards: state.cards.map((c) => ({
                ...c,
                comments: (c.comments || []).filter((cm) => Number(cm.id) !== Number(id)),
              })),
            }),
            false,
            "socket/comment:deleted",
          );
        });

        socket.on("label:added", (label) => {
          set(
            (state) => ({
              cards: state.cards.map((c) =>
                Number(c.id) === Number(label.cardId)
                  ? { ...c, labels: [...(c.labels || []), label] }
                  : c,
              ),
            }),
            false,
            "socket/label:added",
          );
        });

        socket.on("label:removed", ({ id }) => {
          set(
            (state) => ({
              cards: state.cards.map((c) => ({
                ...c,
                labels: (c.labels || []).filter((l) => Number(l.id) !== Number(id)),
              })),
            }),
            false,
            "socket/label:removed",
          );
        });
      },

      disconnectSocket() {
        const socket = getSocket();
        if (!socket) return;
        const events = [
          "board:updated", "board:deleted",
          "list:created", "list:updated", "list:deleted", "list:reordered",
          "card:created", "card:updated", "card:deleted", "card:moved",
          "comment:added", "comment:deleted",
          "label:added", "label:removed",
        ];
        events.forEach((event) => socket.off(event));
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
