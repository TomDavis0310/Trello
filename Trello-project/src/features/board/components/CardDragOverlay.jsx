function getDueDateStatus(dateStr) {
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
}

export default function CardDragOverlay({ card }) {
  if (!card) return null;

  const labels = card.labels || [];
  const dueStatus = getDueDateStatus(card.dueDate);

  return (
    <div className="card drag-overlay">
      <div className="flex flex-row items-start">
        <div className="card-drag-handle flex items-center justify-center w-6 h-6 rounded cursor-grab shrink-0 mt-0.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <circle cx="8" cy="13" r="1.5"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {labels.length > 0 && (
            <div className="card-labels">
              {labels.map((l) => (
                <span
                  key={l.id}
                  className="card-label-dot"
                  style={{ background: l.color }}
                />
              ))}
            </div>
          )}

          <p className="break-words">{card.title}</p>

          <div className="card-footer">
            {dueStatus && (
              <span className={`due-date-badge due-date-badge--sm due-date--${dueStatus}`}>
                {new Date(card.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
            {(card.comments?.length > 0) && (
              <span className="card-comment-count">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                {card.comments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
