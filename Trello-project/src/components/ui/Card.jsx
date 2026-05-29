export default function Card({ card }) {
  return (
    <div className="card" draggable>
      <p>{card.title}</p>
    </div>
  )
}
