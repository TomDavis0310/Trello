import { useState } from 'react'
import useBoardStore from '../../../store/boardStore'
import Card from '../../../components/ui/Card'
import { useDragAndDrop } from '../../../hooks/useDragAndDrop'

export default function BoardColumn({ list }) {
  const [cardTitle, setCardTitle] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const cards = useBoardStore((s) => s.cards.filter((c) => c.listId === list.id))
  const createCard = useBoardStore((s) => s.createCard)
  const { handleDragOver, handleDrop } = useDragAndDrop()

  const handleAddCard = (e) => {
    e.preventDefault()
    if (!cardTitle.trim()) return
    createCard(list.id, cardTitle.trim())
    setCardTitle('')
  }

  const onDragOver = (e) => {
    handleDragOver(e)
    setIsDragOver(true)
  }

  const onDragLeave = () => setIsDragOver(false)

  const onDrop = (e) => {
    setIsDragOver(false)
    handleDrop(e, list.id)
  }

  return (
    <div
      className={`board-column${isDragOver ? ' board-column--drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="column-header">
        <h3>{list.name}</h3>
        <span className="card-count">{cards.length}</span>
      </div>
      <div className="column-cards">
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
      <form className="add-card-form" onSubmit={handleAddCard}>
        <input
          placeholder="+ Add card"
          value={cardTitle}
          onChange={(e) => setCardTitle(e.target.value)}
        />
      </form>
    </div>
  )
}
