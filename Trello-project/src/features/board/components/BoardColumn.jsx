import useBoardStore from '../../../store/boardStore'
import Card from '../../../components/ui/Card'

export default function BoardColumn({ list }) {
  const cards = useBoardStore((s) =>
    s.cards.filter((c) => c.listId === list.id)
  )

  return (
    <div className="board-column">
      <div className="column-header">
        <h3>{list.name}</h3>
        <span className="card-count">{cards.length}</span>
      </div>
      <div className="column-cards">
        {cards.map((card) => (
          <Card key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
