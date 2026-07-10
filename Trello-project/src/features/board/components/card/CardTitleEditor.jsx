import { Input } from "../../../../components/ui/Input";

export default function CardTitleEditor({
  value,
  onChange,
  onBlur,
  onKeyDown,
  error,
}) {
  return (
    <div className="card card--editing">
      <Input
        size="sm"
        autoFocus
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        error={error}
      />
    </div>
  );
}
