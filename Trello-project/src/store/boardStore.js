import { create } from 'zustand'

const useBoardStore = create((set, get) => ({
  boards: [],
  currentBoard: null,
  lists: [],
  cards: [],
  isLoading: false,
  error: null,

  fetchBoards: async () => {
    set({ isLoading: true })
    try {
      // TODO: call API
      set({ boards: [], isLoading: false })
    } catch (err) {
      set({ error: err.message, isLoading: false })
    }
  },

  setCurrentBoard: (board) => set({ currentBoard: board }),

  addList: (list) =>
    set((state) => ({ lists: [...state.lists, list] })),

  moveCard: (cardId, targetListId, targetIndex) => {
    const { cards, lists } = get()
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    const updatedCard = { ...card, listId: targetListId }
    const otherCards = cards.filter((c) => c.id !== cardId)
    const targetCards = otherCards.filter(
      (c) => c.listId === targetListId
    )
    targetCards.splice(targetIndex, 0, updatedCard)
    const finalCards = [
      ...otherCards.filter((c) => c.listId !== targetListId),
      ...targetCards,
    ]
    set({ cards: finalCards })
  },
}))

export default useBoardStore
