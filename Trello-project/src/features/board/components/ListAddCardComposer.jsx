import { Input } from "../../../components/ui/Input";

export default function ListAddCardComposer({
  isOpen,
  value,
  onChange,
  onBlur,
  error,
  onSubmit,
  onCancel,
  onOpen,
}) {
  return (
    <div className="add-card-area">
      {isOpen ? (
        <Input
          size="sm"
          autoFocus
          className="add-card-input"
          data-testid="add-card-input"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          error={error}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="Enter card title and press Enter"
        />
      ) : (
        <button
          className="add-card-btn"
          data-testid="add-card-button"
          onClick={onOpen}
        >
          + Add a card
        </button>
      )}
    </div>
  );
}
