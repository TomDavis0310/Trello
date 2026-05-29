import { useCallback } from 'react'
import useBoardStore from '../store/boardStore'

export function useDragAndDrop() {
  const moveCard = useBoardStore((s) => s.moveCard)

  const handleDragStart = useCallback((e, cardId) => {
    e.dataTransfer.setData('text/plain', String(cardId))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e, targetListId) => {
    e.preventDefault()
    const cardId = Number(e.dataTransfer.getData('text/plain'))
    if (!cardId) return
    moveCard(cardId, targetListId, 0)
  }, [moveCard])

  return { handleDragStart, handleDragOver, handleDrop }
}
