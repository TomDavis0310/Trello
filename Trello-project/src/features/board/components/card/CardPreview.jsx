import {
  formatCardDueDate,
  getCardLabels,
  getDueDateStatus,
} from "../../utils/cardPresentation";

const DEFAULT_DRAG_HANDLE_CLASS_NAME =
  "card-drag-handle flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0 mt-0.5";

function CardHandle({ dragHandle }) {
  const handleClassName =
    dragHandle?.className || DEFAULT_DRAG_HANDLE_CLASS_NAME;

  if (dragHandle?.as === "button") {
    return (
      <button
        className={handleClassName}
        data-testid={dragHandle.testId}
        {...dragHandle.props}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
    );
  }

  return (
    <div className={handleClassName} data-testid={dragHandle?.testId}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="3" r="1.5" />
        <circle cx="8" cy="8" r="1.5" />
        <circle cx="8" cy="13" r="1.5" />
      </svg>
    </div>
  );
}

export default function CardPreview({
  card,
  activeLabel = null,
  onLabelClick,
  onTitleClick,
  titleTestId,
  dragHandle,
  showDeleteButton = false,
  onDeleteClick,
}) {
  const labels = getCardLabels(card);
  const dueStatus = getDueDateStatus(card.dueDate);

  return (
    <>
      <CardHandle dragHandle={dragHandle} />

      <div className="flex-1 min-w-0">
        {labels.length > 0 && (
          <div className="card-labels">
            {labels.map((label) => (
              <span
                key={label.id}
                className={`card-label-dot${activeLabel === label.id ? " active" : ""}`}
                style={{ background: label.color }}
                onClick={
                  onLabelClick
                    ? (event) => {
                        event.stopPropagation();
                        onLabelClick(label.id);
                      }
                    : undefined
                }
                title={label.text}
              />
            ))}
          </div>
        )}

        <p
          className="break-words"
          data-testid={titleTestId}
          onClick={onTitleClick}
        >
          {card.title}
        </p>

        <div className="card-footer">
          {dueStatus && (
            <span
              className={`due-date-badge due-date-badge--sm due-date--${dueStatus}`}
            >
              {formatCardDueDate(card.dueDate)}
            </span>
          )}
          {card.comments?.length > 0 && (
            <span className="card-comment-count">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {card.comments.length}
            </span>
          )}
        </div>
      </div>

      {showDeleteButton && (
        <button
          className="card-delete-btn"
          title="Delete card"
          onClick={onDeleteClick}
        >
          &times;
        </button>
      )}
    </>
  );
}
