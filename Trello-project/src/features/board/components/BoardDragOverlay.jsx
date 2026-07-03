import { DragOverlay } from "@dnd-kit/core";
import CardDragOverlay from "./CardDragOverlay";

export default function BoardDragOverlay({ activeType, activeItem }) {
  return (
    <DragOverlay>
      {activeType === "card" && activeItem ? (
        <CardDragOverlay card={activeItem} />
      ) : null}
      {activeType === "list" && activeItem ? (
        <div className="board-column-wrapper drag-overlay">
          <div className="board-column">
            <h3>{activeItem.name}</h3>
          </div>
        </div>
      ) : null}
    </DragOverlay>
  );
}
