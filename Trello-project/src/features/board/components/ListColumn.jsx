import { useState, useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ConfirmModal from "../../../components/common/ConfirmModal";
import ListAddCardComposer from "./ListAddCardComposer";
import ListColumnHeader from "./ListColumnHeader";
import ListDropArea from "./ListDropArea";

export default function ListColumn({
  list,
  cardIds = [],
  cardMap = {},
  onDelete,
  addingFor,
  openAdd,
  closeAdd,
  submitAdd,
  newTitle,
  setNewTitle,
  cardError,
  filterLabel,
  setFilterLabel,
}) {
  const sortableData = useMemo(
    () => ({ type: "list", listId: String(list.id) }),
    [list.id],
  );
  const {
    setNodeRef: setCardsDroppableRef,
    isOver: isCardAreaOver,
  } = useDroppable({
    id: `list-drop-${list.id}`,
    data: sortableData,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list-${list.id}`,
    data: sortableData,
    handle: true,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const safeStringCardIds = useMemo(
    () => cardIds.map((id) => `card-${id}`),
    [cardIds],
  );

  console.log("[T1 ListColumn]", {
    listId: list.id,
    cardIds: safeStringCardIds,
    isEmpty: safeStringCardIds.length === 0,
  });

  return (
    <div
      ref={setNodeRef}
      data-testid="list-column"
      data-list-id={String(list.id)}
      data-list-name={list.name}
      className={`board-column-wrapper${isDragging ? " board-column--dragging" : ""}`}
      style={style}
    >
      <div className="board-column">
        <ListColumnHeader
          listName={list.name}
          dragHandleProps={{
            ...listeners,
            ...attributes,
          }}
          onDeleteClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(true);
          }}
        />

        <ListDropArea
          cardIds={safeStringCardIds}
          cardMap={cardMap}
          droppableRef={setCardsDroppableRef}
          isOver={isCardAreaOver}
          activeLabel={filterLabel}
          onLabelClick={(labelId) =>
            setFilterLabel(labelId === filterLabel ? null : labelId)
          }
        />

        <ListAddCardComposer
          isOpen={addingFor === list.id}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={closeAdd}
          error={cardError}
          onSubmit={submitAdd}
          onCancel={closeAdd}
          onOpen={() => openAdd(list.id)}
        />
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDelete(list.id);
          setShowDeleteConfirm(false);
        }}
        title={`Delete "${list.name}"`}
        message={
          <>
            <p>Are you sure you want to delete this list and all its cards?</p>
            <p className="muted">This action cannot be undone.</p>
          </>
        }
      />
    </div>
  );
}
