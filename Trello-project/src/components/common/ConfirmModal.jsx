import Modal from "../ui/Modal";
import Button from "../ui/Button";

// === ConfirmModal (Common) ===
// Modal xác nhận dùng cho các hành động nguy hiểm (xóa board, list, card).
// Props:
//   - isOpen: boolean
//   - onCancel: () => void  – đóng modal
//   - onConfirm: () => void – thực thi hành động
//   - title: string (mặc định "Delete Card")
//   - message: React node (mặc định thông báo xóa card)
export default function ConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  title = "Delete Card",
  message = (
    <>
      <p>Are you sure you want to delete this card?</p>
      <p className="muted">This action cannot be undone.</p>
    </>
  ),
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="confirm-body">{message}</div>
      <div className="confirm-actions">
        <Button variant="ghost" onClick={onCancel} aria-label="Cancel">
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} aria-label="Delete">
          Delete
        </Button>
      </div>
    </Modal>
  );
}
