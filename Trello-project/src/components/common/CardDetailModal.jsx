import { useState } from "react";
import Modal from "../ui/Modal";
import useBoardStore from "../../store/boardStore";
import { z } from "zod";

const DescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional();

function CardDetailBody({ card, column, onClose }) {
  const updateCardDetail = useBoardStore((s) => s.updateCardDetail);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(card.description || "");
  const [error, setError] = useState(null);

  const handleSaveDescription = () => {
    try {
      DescriptionSchema.parse(descDraft);
    } catch (err) {
      setError(err.errors ? err.errors[0].message : "Invalid description");
      return;
    }

    updateCardDetail(card.id, { description: descDraft });
    setIsEditingDesc(false);
    setError(null);
  };

  return (
    <div className="card-detail-body">
      <div className="card-detail-meta">
        <div>
          Column:{" "}
          <span>{column ? column.name : "—"}</span>
        </div>
        <div className="card-detail-id">ID: {card.id}</div>
      </div>

      <div>
        <h3 className="card-detail-section-title">Description</h3>
        {!isEditingDesc ? (
          <div>
            <div className="card-detail-description">
              {card.description || (
                <span className="card-detail-description-empty">No description</span>
              )}
            </div>
            <div className="card-detail-actions">
              <button
                className="btn btn--md btn--primary"
                onClick={() => setIsEditingDesc(true)}
              >
                Edit
              </button>
              <button
                className="btn btn--md btn--ghost"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div>
            <textarea
              className="card-detail-textarea"
              rows={6}
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              maxLength={500}
            />
            {error && (
              <div className="card-detail-error">{error}</div>
            )}
            <div className="card-detail-edit-actions">
              <button
                className="btn btn--md"
                onClick={() => {
                  setDescDraft(card.description || "");
                  setIsEditingDesc(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
              <button
                className="btn btn--md btn--primary"
                onClick={handleSaveDescription}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CardDetailModal() {
  const activeCardId = useBoardStore((s) => s.activeCardId);
  const closeCardModal = useBoardStore((s) => s.closeCardModal);
  const cards = useBoardStore((s) => s.cards);
  const lists = useBoardStore((s) => s.lists);

  const card = cards.find((c) => c.id === activeCardId) || null;
  const column = card ? lists.find((l) => l.id === card.listId) : null;

  return (
    <Modal isOpen={!!card} onClose={closeCardModal} title={card?.title ?? ""}>
      {card && (
        <CardDetailBody
          key={card.id}
          card={card}
          column={column}
          onClose={closeCardModal}
        />
      )}
    </Modal>
  );
}
