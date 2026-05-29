import { create } from 'zustand'

let nextId = 1
const genId = () => nextId++

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
      const saved = localStorage.getItem('trello-data')
      if (saved) {
        const data = JSON.parse(saved)
        nextId = data.nextId
        set({ boards: data.boards, lists: data.lists, cards: data.cards, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  _persist: () => {
    const { boards, lists, cards } = get()
    localStorage.setItem('trello-data', JSON.stringify({ nextId, boards, lists, cards }))
  },

  setCurrentBoard: (board) => set({ currentBoard: board }),

  /* Board CRUD */
  createBoard: (name) => {
    const board = { id: genId(), name, createdAt: Date.now() }
    set((state) => ({ boards: [...state.boards, board] }))
    get()._persist()
    return board
  },

  updateBoard: (id, data) => {
    set((state) => ({
      boards: state.boards.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }))
    get()._persist()
  },

  deleteBoard: (id) => {
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== id),
      lists: state.lists.filter((l) => l.boardId !== id),
      cards: state.cards.filter((c) => {
        const list = get().lists.find((l) => l.id === c.listId)
        return list && list.boardId !== id
      }),
    }))
    get()._persist()
  },

  /* List CRUD */
  createList: (boardId, name) => {
    const list = { id: genId(), boardId, name }
    set((state) => ({ lists: [...state.lists, list] }))
    get()._persist()
    return list
  },

  updateList: (id, data) => {
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? { ...l, ...data } : l)),
    }))
    get()._persist()
  },

  deleteList: (id) => {
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      cards: state.cards.filter((c) => c.listId !== id),
    }))
    get()._persist()
  },

  /* Card CRUD */
  createCard: (listId, title) => {
    const card = { id: genId(), listId, title, createdAt: Date.now() }
    set((state) => ({ cards: [...state.cards, card] }))
    get()._persist()
    return card
  },

  updateCard: (id, data) => {
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }))
    get()._persist()
  },

  deleteCard: (id) => {
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) }))
    get()._persist()
  },

  moveCard: (cardId, targetListId, targetIndex) => {
    const { cards } = get()
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
    get()._persist()
  },
}))

export default useBoardStore
