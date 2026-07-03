import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import Card from "./Card";

export default function ListDropArea({
  cardIds = [],
  cardMap = {},
  droppableRef,
  isOver = false,
  activeLabel,
  onLabelClick,
}) {
  return (
    <div
      ref={droppableRef}
      data-testid="list-card-area"
      className={`column-cards${isOver ? " column-cards--over" : ""}`}
    >
      <SortableContext
        items={cardIds}
        strategy={verticalListSortingStrategy}
      >
        {cardIds.map((cardId) => {
          const card = cardMap[cardId];
          if (!card) return null;

          return (
            <Card
              key={cardId}
              card={card}
              onLabelClick={onLabelClick}
              activeLabel={activeLabel}
            />
          );
        })}
      </SortableContext>

      {cardIds.length === 0 && (
        <div
          className="empty-list-drop-zone"
          data-testid="empty-list-drop-zone"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
