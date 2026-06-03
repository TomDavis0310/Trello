import Modal from "../ui/Modal";
import Button from "../ui/Button";

// Reusable confirmation modal for destructive actions.
// Props:
// - isOpen: boolean
// - onCancel: () => void
// - onConfirm: () => void
// - title?: string
// - message?: React.Node
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
