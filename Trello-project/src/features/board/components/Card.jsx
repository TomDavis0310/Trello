import { useMemo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import useBoardStore from "../../../store/boardStore";
import ConfirmModal from "../../../components/common/ConfirmModal";
import CardPreview from "./CardPreview";
import CardTitleEditor from "./CardTitleEditor";
import useCardTitleEditor from "./useCardTitleEditor";

export default function Card({ card, onLabelClick, activeLabel }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const updateCard = useBoardStore((s) => s.updateCard);
  const deleteCard = useBoardStore((s) => s.deleteCard);
  const openCardModal = useBoardStore((s) => s.openCardModal);
  const {
    editing,
    title,
    titleError,
    setTitle,
    handleSave,
    handleKeyDown,
    handleStartEditing,
  } = useCardTitleEditor({
    cardTitle: card.title,
    onSaveTitle: (nextTitle) => updateCard(card.id, { title: nextTitle }),
  });

  const sortableData = useMemo(
    () => ({
      type: "card",
      cardId: String(card.id),
      listId: String(card.listId),
    }),
    [card.id, card.listId],
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
    data: sortableData,
    handle: true,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleDeleteClick = () => setShowDeleteModal(true);

  const handleConfirmDelete = () => {
    deleteCard(card.id);
    setShowDeleteModal(false);
  };

  if (editing) {
    return (
      <CardTitleEditor
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        error={titleError}
      />
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        data-testid="card"
        data-card-id={String(card.id)}
        data-card-title={card.title}
        data-list-id={String(card.listId)}
        className={`card break-words group flex flex-row items-start${isDragging ? " dragging" : ""}`}
        style={style}
        onClick={() => openCardModal(card.id)}
      >
        <CardPreview
          card={card}
          activeLabel={activeLabel}
          onLabelClick={onLabelClick}
          titleTestId="card-title"
          onTitleClick={(e) => {
            e.stopPropagation();
            handleStartEditing();
          }}
          dragHandle={{
            as: "button",
            className:
              "card-drag-handle invisible group-hover:visible group-focus-within:visible flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0 mt-0.5",
            testId: "card-drag-handle",
            props: {
              ...listeners,
              ...attributes,
              onClick: (e) => e.stopPropagation(),
            },
          }}
          showDeleteButton
          onDeleteClick={(e) => {
            e.stopPropagation();
            handleDeleteClick();
          }}
        />
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
