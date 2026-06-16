import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BoardContent from "../components/BoardContent";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import CardDetailModal from "../components/CardDetailModal";
import useBoardStore from "../../../store/boardStore";

// === Board Page ===
// Trang chi tiết board. Nhận `:id` từ URL params, hiển thị tên board (có thể inline-edit),
// và nội dung board (các list + card) thông qua component `BoardContent`.
// Nếu board không tồn tại, hiển thị thông báo + nút "Go back".
export default function BoardPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mẹo: Giữ nguyên id dạng gốc (String) hoặc linh hoạt ép kiểu để tránh lỗi so sánh nghiêm ngặt (===) trong Store
  const boardId = id;

  const boards = useBoardStore((s) => s.boards);
  const updateBoard = useBoardStore((s) => s.updateBoard);
  const setCurrentBoard = useBoardStore((s) => s.setCurrentBoard);

  // So sánh linh hoạt bằng == để nhận diện đúng cả ID dạng chuỗi lẫn dạng số từ API
  const board = boards.find((b) => b.id == boardId);

  const [editingName, setEditingName] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const titleError =
    editTitle.length > 50 ? "Tiêu đề không được quá 50 ký tự" : null;

  // Cập nhật currentBoard vào Store bất cứ khi nào đổi trang Board khác nhau
  useEffect(() => {
    if (board) {
      setCurrentBoard(board);
    }
  }, [board, setCurrentBoard]);

  const handleRename = () => {
    if (titleError) return;
    if (editTitle.trim() && editTitle !== board?.name) {
      // Đảm bảo truyền đúng định dạng ID mà board đang sở hữu
      updateBoard(board.id, { name: editTitle.trim() });
    }
    setEditingName(false);
  };

  if (!board) {
    return (
      <div className="board-page">
        <div className="board-not-found">
          <p>Board not found.</p>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <header className="board-header">
        <div className="board-header-row">
          {/* Inline edit title: click vào h1 để chuyển sang input */}
          {editingName ? (
            <Input
              size="lg"
              autoFocus
              className="board-title-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleRename}
              error={titleError}
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

      {/* Nội dung board: Gửi board.id chuẩn từ object đã tìm thấy để component con render chính xác */}
      <BoardContent boardId={board.id} />

      {/* Modal hiển thị chi tiết thẻ */}
      <CardDetailModal />
    </div>
  );
}
