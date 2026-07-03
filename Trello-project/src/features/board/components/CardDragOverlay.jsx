import CardPreview from "./CardPreview";

export default function CardDragOverlay({ card }) {
  if (!card) return null;

  return (
    <div className="card drag-overlay">
      <div className="flex flex-row items-start">
        <CardPreview card={card} />
      </div>
    </div>
  );
}
