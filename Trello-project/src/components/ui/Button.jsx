// Component `Button` (trạng thái hiển thị) dùng trong toàn ứng dụng.
// - Giữ nhất quán style qua props `variant` và `size`.
// - Chuyển tiếp các props native của `button` (ví dụ `onClick`, `type`).
export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  ...props
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
