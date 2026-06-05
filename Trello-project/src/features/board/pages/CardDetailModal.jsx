import { useState } from "react";
import Modal from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import useBoardStore from "../../../store/boardStore";
import useAuthStore from "../../../store/authStore";
import { z } from "zod";

// LABEL_COLORS — bảng màu có sẵn cho label, lấy cảm hứng từ Trello
// Mỗi màu có: color (mã hex), name (tên hiển thị tooltip)
const LABEL_COLORS = [
  { color: "#61bd4f", name: "Green" },
  { color: "#f2d600", name: "Yellow" },
  { color: "#ff9f1a", name: "Orange" },
  { color: "#eb5a46", name: "Red" },
  { color: "#c377e0", name: "Purple" },
  { color: "#0079bf", name: "Blue" },
  { color: "#00c2e0", name: "Sky" },
  { color: "#51e898", name: "Lime" },
  { color: "#ff78cb", name: "Pink" },
  { color: "#b04632", name: "Maroon" },
];

// DescriptionSchema: dùng Zod để validate mô tả card
// - Tối đa 500 ký tự
// - Optional (có thể bỏ trống)
const DescriptionSchema = z
  .string()
  .max(500, "Description must be at most 500 characters")
  .optional();

// CardDetailBody — nội dung bên trong modal chi tiết card
// Nhận props:
//   - card: object card đang mở
//   - column: object column chứa card (để hiển thị tên cột)
//   - onClose: callback đóng modal
//
// Chứa các section:
//   1. Labels — quản lý nhãn màu (thêm/xóa)
//   2. Due Date — xem/sửa/xóa ngày hết hạn
//   3. Description — xem/sửa mô tả (inline edit với textarea)
//   4. Comments — xem, thêm, xóa comment
function CardDetailBody({ card, column, onClose }) {
  // Actions từ boardStore
  const updateCardDetail = useBoardStore((s) => s.updateCardDetail);
  const addComment = useBoardStore((s) => s.addComment);
  const deleteComment = useBoardStore((s) => s.deleteComment);
  const addLabel = useBoardStore((s) => s.addLabel);
  const removeLabel = useBoardStore((s) => s.removeLabel);
  const setDueDate = useBoardStore((s) => s.setDueDate);
  const user = useAuthStore((s) => s.user); // user hiện tại (để gán tên tác giả comment)

  // State cho Description
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(card.description || "");
  const [error, setError] = useState(null);

  // State cho Comments
  const [commentText, setCommentText] = useState("");

  // State cho Labels
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [labelText, setLabelText] = useState("");

  // State cho Due Date
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [dueDateDraft, setDueDateDraft] = useState(card.dueDate || "");

  // handleSaveDescription: validate Zod trước khi lưu
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

  // handleAddLabel: thêm label mới
  // - color: mã hex từ bảng màu
  // - text: nếu người dùng không nhập → dùng color làm text
  const handleAddLabel = (color) => {
    const text = labelText.trim() || color;
    addLabel(card.id, { color, text });
    setLabelText("");
    setShowLabelPicker(false);
  };

  const handleRemoveLabel = (labelId) => {
    removeLabel(card.id, labelId);
  };

  // handleSaveDueDate: lưu due date (chuỗi ISO hoặc null để xóa)
  const handleSaveDueDate = () => {
    setDueDate(card.id, dueDateDraft || null);
    setEditingDueDate(false);
  };

  const handleRemoveDueDate = () => {
    setDueDate(card.id, null);
    setDueDateDraft("");
    setEditingDueDate(false);
  };

  const labels = card.labels || [];

  // getDueDateStatus: tính trạng thái due date
  // Dùng logic y hệt Card.jsx để đồng bộ màu sắc
  const getDueDateStatus = (dateStr) => {
    if (!dateStr) return null;
    const now = new Date();
    const due = new Date(dateStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diff = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "overdue";
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    return "upcoming";
  };

  // Comment handlers
  const handleAddComment = () => {
    const text = commentText.trim();
    if (!text) return;
    addComment(card.id, text, user?.name || "Unknown");
    setCommentText("");
  };

  // Enter (không shift) → gửi comment; Shift+Enter → xuống dòng
  const handleCommentKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  const comments = card.comments || [];

  return (
    <div className="card-detail-body">
      {/* === Meta info: tên column + ID card === */}
      <div className="card-detail-meta">
        <div>
          Column: <span>{column ? column.name : "—"}</span>
        </div>
        <div className="card-detail-id">ID: {card.id}</div>
      </div>

      {/* === Labels section === */}
      {/* Hiển thị các label dạng tag màu, mỗi tag có nút × để xóa.
          Nút "+ Add label" / "+" để mở/đóng label picker.
          Picker hiển thị 10 ô màu + input text tùy chọn. */}
      <div>
        <h3 className="card-detail-section-title">Labels</h3>
        <div className="card-detail-labels">
          {labels.map((l) => (
            <span key={l.id} className="card-label-tag" style={{ background: l.color }}>
              {l.text}
              <button className="card-label-remove" onClick={() => handleRemoveLabel(l.id)}>&times;</button>
            </span>
          ))}
          <button className="btn btn--sm btn--ghost" onClick={() => setShowLabelPicker(!showLabelPicker)}>
            {labels.length === 0 ? "+ Add label" : "+"}
          </button>
        </div>
        {showLabelPicker && (
          <div className="label-picker">
            {/* Bảng màu: click vào ô màu → thêm label với màu đó */}
            <div className="label-picker-colors">
              {LABEL_COLORS.map((lc) => (
                <button key={lc.color} className="label-color-swatch" style={{ background: lc.color }}
                  title={lc.name} onClick={() => handleAddLabel(lc.color)} />
              ))}
            </div>
            {/* Input text tùy chọn cho label, Enter → thêm với màu đầu tiên */}
            <div className="label-picker-custom">
              <Input className="label-picker-input" placeholder="Label text (optional)" value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddLabel(LABEL_COLORS[0].color); }} />
            </div>
          </div>
        )}
      </div>

      {/* === Due Date section === */}
      {/* Chế độ xem: hiển thị badge màu + nút "Set date"/"Change" + "Remove"
          Chế độ edit: <input type="date"> + Cancel/Save */}
      <div>
        <h3 className="card-detail-section-title">Due Date</h3>
        {!editingDueDate ? (
          <div className="card-detail-due">
            {card.dueDate ? (
              <span className={`due-date-badge due-date--${getDueDateStatus(card.dueDate)}`}>
                {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            ) : (
              <span className="card-detail-description-empty">No due date</span>
            )}
            <div className="card-detail-actions">
              <button className="btn btn--sm btn--primary" onClick={() => { setDueDateDraft(card.dueDate || ""); setEditingDueDate(true); }}>
                {card.dueDate ? "Change" : "Set date"}
              </button>
              {card.dueDate && (
                <button className="btn btn--sm btn--ghost" onClick={handleRemoveDueDate}>Remove</button>
              )}
            </div>
          </div>
        ) : (
          <div className="card-detail-due-edit">
            <Input type="date" className="due-date-input" value={dueDateDraft}
              onChange={(e) => setDueDateDraft(e.target.value)} />
            <div className="card-detail-edit-actions">
              <button className="btn btn--sm" onClick={() => setEditingDueDate(false)}>Cancel</button>
              <button className="btn btn--sm btn--primary" onClick={handleSaveDueDate}>Save</button>
            </div>
          </div>
        )}
      </div>

      {/* === Description section === */}
      {/* Chế độ xem: text description + nút "Edit"
          Chế độ edit: textarea (Zod validate 500 ký tự) + Cancel/Save */}
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
              <button className="btn btn--md btn--primary" onClick={() => setIsEditingDesc(true)}>Edit</button>
              <button className="btn btn--md btn--ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <div>
            <textarea className="card-detail-textarea" rows={6} value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)} maxLength={500} />
            {error && <div className="card-detail-error">{error}</div>}
            <div className="card-detail-edit-actions">
              <button className="btn btn--md" onClick={() => { setDescDraft(card.description || ""); setIsEditingDesc(false); setError(null); }}>Cancel</button>
              <button className="btn btn--md btn--primary" onClick={handleSaveDescription}>Save</button>
            </div>
          </div>
        )}
      </div>

      {/* === Comments section === */}
      {/* Danh sách comment: mỗi comment có author, thời gian, text, nút × xóa
          Input: textarea 2 dòng + nút Send, Enter để gửi */}
      <div>
        <h3 className="card-detail-section-title">Comments ({comments.length})</h3>
        <div className="card-detail-comments">
          {comments.length === 0 && (
            <p className="card-detail-description-empty">No comments yet</p>
          )}
          {comments.map((cm) => (
            <div key={cm.id} className="comment-item">
              <div className="comment-header">
                <span className="comment-author">{cm.author}</span>
                <span className="comment-date">{new Date(cm.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                <button className="comment-delete-btn" title="Delete comment"
                  onClick={() => deleteComment(card.id, cm.id)}>&times;</button>
              </div>
              <div className="comment-text">{cm.text}</div>
            </div>
          ))}
        </div>
        <div className="comment-input-wrap">
          <textarea className="card-detail-textarea comment-input" rows={2} placeholder="Write a comment..."
            value={commentText} onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={handleCommentKeyDown} />
          <button className="btn btn--sm btn--primary" disabled={!commentText.trim()} onClick={handleAddComment}>Send</button>
        </div>
      </div>
    </div>
  );
}

// CardDetailModal — component modal chi tiết card, render trong BoardPage
// Hoạt động như một global modal: tự động hiện/khi ẩn dựa trên activeCardId
// - activeCardId !== null → có card đang được chọn → mở modal
// - activeCardId === null → ẩn modal
// Khi đóng modal → gọi closeCardModal() để reset activeCardId về null
export default function CardDetailModal() {
  const activeCardId = useBoardStore((s) => s.activeCardId);
  const closeCardModal = useBoardStore((s) => s.closeCardModal);
  const cards = useBoardStore((s) => s.cards);
  const lists = useBoardStore((s) => s.lists);

  // Tìm card và column tương ứng từ store
  const card = cards.find((c) => c.id === activeCardId) || null;
  const column = card ? lists.find((l) => l.id === card.listId) : null;

  return (
    // Modal dùng createPortal để render ra document.body
    // isOpen = !!card (truthy khi có card)
    <Modal isOpen={!!card} onClose={closeCardModal} title={card?.title ?? ""}>
      {card && (
        // key={card.id} đảm bảo React re-mount component mỗi khi mở card khác
        // → state local (descDraft, commentText, ...) được reset
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
