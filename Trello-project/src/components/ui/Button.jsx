// === Button (UI) ===
// Component nút dùng chung toàn ứng dụng.
// Props:
//   - variant: 'primary' (mặc định) | 'ghost' | 'danger'
//   - size: 'md' (mặc định)
//   - disabled: boolean
//   - ...props: các thuộc tính native của <button> (onClick, type, aria-label, ...)
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
