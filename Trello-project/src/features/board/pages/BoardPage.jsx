import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import BoardColumn from '../components/BoardColumn'
import Button from '../../../components/ui/Button'
import useBoardStore from '../../../store/boardStore'

export default function BoardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const boardId = Number(id)
  const boards = useBoardStore((s) => s.boards)
  const lists = useBoardStore((s) => s.lists)
  const createList = useBoardStore((s) => s.createList)
  const deleteList = useBoardStore((s) => s.deleteList)
  const updateBoard = useBoardStore((s) => s.updateBoard)

  const board = boards.find((b) => b.id === boardId)
  const boardLists = lists.filter((l) => l.boardId === boardId)

  const [listName, setListName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  const handleAddList = (e) => {
    e.preventDefault()
    if (!listName.trim()) return
    createList(boardId, listName.trim())
    setListName('')
  }

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== board?.name) {
      updateBoard(boardId, { name: editTitle.trim() })
    }
    setEditingName(false)
  }

  if (!board) {
    return (
      <div className="board-page">
        <p>Board not found. <Button variant="ghost" onClick={() => navigate('/')}>Go back</Button></p>
      </div>
    )
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-row">
          {editingName ? (
            <input
              autoFocus
              className="board-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditingName(false); setEditTitle(board.name) } }}
            />
          ) : (
            <h1 onClick={() => { setEditTitle(board.name); setEditingName(true) }}>{board.name}</h1>
          )}
          <Button variant="ghost" onClick={() => navigate('/')}>All Boards</Button>
        </div>
      </header>
      <div className="board-columns">
        {boardLists.map((list) => (
          <div key={list.id} className="board-column-wrapper">
            <BoardColumn list={list} />
            <button
              className="list-delete-btn"
              title="Delete list"
              onClick={() => { if (confirm(`Delete "${list.name}"?`)) deleteList(list.id) }}
            >
              &times;
            </button>
          </div>
        ))}
        <form className="add-list-form" onSubmit={handleAddList}>
          <input
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
        </form>
      </div>
    </div>
  )
}
