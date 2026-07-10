import { useState } from "react";

export default function useCardTitleEditor({ cardTitle, onSaveTitle }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(cardTitle);

  const titleError =
    title.length > 50 ? "Tiêu đề không được quá 50 ký tự" : null;

  const handleSave = () => {
    if (titleError) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle && trimmedTitle !== cardTitle) {
      onSaveTitle(trimmedTitle);
    } else {
      setTitle(cardTitle);
    }

    setEditing(false);
  };

  const handleCancel = () => {
    setTitle(cardTitle);
    setEditing(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") handleSave();
    if (event.key === "Escape") handleCancel();
  };

  const handleStartEditing = () => {
    setTitle(cardTitle);
    setEditing(true);
  };

  return {
    editing,
    title,
    titleError,
    setTitle,
    handleSave,
    handleKeyDown,
    handleStartEditing,
  };
}
