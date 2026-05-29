import { useParams } from 'react-router-dom'
import BoardColumn from '../components/BoardColumn'
import useBoardStore from '../../../store/boardStore'

export default function BoardPage() {
  const { id } = useParams()
  const lists = useBoardStore((s) => s.lists)

  return (
    <div className="board-page">
      <header className="board-header">
        <h1>Board {id}</h1>
      </header>
      <div className="board-columns">
        {lists.map((list) => (
          <BoardColumn key={list.id} list={list} />
        ))}
      </div>
    </div>
  )
}
