export function getCardLabels(card) {
  return card.labels || [];
}

export function getDueDateStatus(dateStr) {
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

export function formatCardDueDate(dateStr) {
  if (!dateStr) return "";

  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
