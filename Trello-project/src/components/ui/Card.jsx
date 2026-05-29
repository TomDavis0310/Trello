import { useState } from 'react'
import useBoardStore from '../../store/boardStore'
import { useDragAndDrop } from '../../hooks/useDragAndDrop'

export default function Card({ card }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(card.title)
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const { handleDragStart } = useDragAndDrop()

  const handleSave = () => {
    if (title.trim() && title.trim() !== card.title) {
      updateCard(card.id, { title: title.trim() })
    } else {
      setTitle(card.title)
    }
    setEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setTitle(card.title); setEditing(false) }
  }

  if (editing) {
    return (
      <div className="card card--editing">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      </div>
    )
  }

  return (
    <div
      className="card"
      draggable
      onDragStart={(e) => handleDragStart(e, card.id)}
    >
      <p onClick={() => { setTitle(card.title); setEditing(true) }}>{card.title}</p>
      <button
        className="card-delete-btn"
        title="Delete card"
        onClick={() => { if (confirm('Delete this card?')) deleteCard(card.id) }}
      >
        &times;
      </button>
    </div>
  )
}
