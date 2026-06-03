import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BoardContent from "../components/BoardContent";
import Button from "../../../components/ui/Button";
import useBoardStore from "../../../store/boardStore";

export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const boardId = Number(id);
  const boards = useBoardStore((s) => s.boards);
  const updateBoard = useBoardStore((s) => s.updateBoard);

  const board = boards.find((b) => b.id === boardId);

  const [editingName, setEditingName] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== board?.name) {
      updateBoard(boardId, { name: editTitle.trim() });
    }
    setEditingName(false);
  };

  if (!board) {
    return (
      <div className="board-page">
        <p>
          Board not found.{" "}
          <Button variant="ghost" onClick={() => navigate("/")}>
            Go back
          </Button>
        </p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-row">
          {editingName ? (
            <input
              autoFocus
              className="board-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditingName(false);
                  setEditTitle(board.name);
                }
              }}
            />
          ) : (
            <h1
              onClick={() => {
                setEditTitle(board.name);
                setEditingName(true);
              }}
            >
              {board.name}
            </h1>
          )}
          <Button variant="ghost" onClick={() => navigate("/")}>
            All Boards
          </Button>
        </div>
      </header>
      <BoardContent boardId={boardId} />
    </div>
  );
}
