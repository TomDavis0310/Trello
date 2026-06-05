import { useState } from "react";
import BoardList from "../components/BoardList";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import useBoardStore from "../../../store/boardStore";

// === Dashboard Page ===
// Trang tổng quan hiển thị danh sách các Board.
// Cho phép tạo board mới qua modal nhập tên.
export default function DashboardPage() {
  const [showModal, setShowModal] = useState(false);
  const [boardName, setBoardName] = useState("");
  const createBoard = useBoardStore((s) => s.createBoard);

  const handleCreate = (e) => {
    e.preventDefault();

    const name = boardName.trim();

    if (!name) return;

    createBoard(name);
    setBoardName("");
    setShowModal(false);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>My Boards</h1>
        <Button onClick={() => setShowModal(true)}>+ New Board</Button>
      </div>
      {/* Danh sách các board */}
      <BoardList />
      {/* Modal tạo board mới */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create Board"
      >
        <form className="crud-form" onSubmit={handleCreate}>
          <Input
            autoFocus
            placeholder="Board name"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            required
          />
          <div className="crud-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
