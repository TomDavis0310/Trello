export default function ListColumnHeader({
  listName,
  dragHandleProps,
  onDeleteClick,
}) {
  return (
    <div className="column-header group" style={{ justifyContent: "normal" }}>
      <button
        className="list-drag-handle invisible group-hover:visible group-focus-within:visible flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0"
        data-testid="list-drag-handle"
        {...dragHandleProps}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      <h3 className="flex-1 min-w-0" data-testid="list-title">
        {listName}
      </h3>

      <button className="list-delete-btn" onClick={onDeleteClick}>
        &times;
      </button>
    </div>
  );
}
