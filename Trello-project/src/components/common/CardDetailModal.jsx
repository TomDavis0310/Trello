import { useState } from "react";
import Modal from "../ui/Modal";
import useBoardStore from "../../store/boardStore";
import { z } from "zod";

// Schema Zod cho mô tả card: tối đa 500 ký tự
const DescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional();

// === CardDetailBody ===
// Nội dung bên trong modal chi tiết card.
// Cho phép xem và chỉnh sửa mô tả (inline edit với textarea + nút Save/Cancel).
function CardDetailBody({ card, column, onClose }) {
  const updateCardDetail = useBoardStore((s) => s.updateCardDetail);

  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(card.description || "");
  const [error, setError] = useState(null);

  // Lưu mô tả sau khi validate
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
      {/* Thông tin: cột chứa card + ID */}
      <div className="card-detail-meta">
        <div>
          Column:{" "}
          <span>{column ? column.name : "—"}</span>
        </div>
        <div className="card-detail-id">ID: {card.id}</div>
      </div>

      {/* Mô tả card */}
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

// === CardDetailModal ===
// Modal chi tiết card: tự động mở khi `activeCardId !== null` trong boardStore.
// Tìm card và column tương ứng, render CardDetailBody bên trong Modal.
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
