export default function AddListInlineForm({ value, onChange, onSubmit }) {
  return (
    <form className="add-list-form" onSubmit={onSubmit}>
      <input
        className="add-list-input"
        data-testid="add-list-input"
        placeholder="+ Add list"
        value={value}
        onChange={onChange}
      />
    </form>
  );
}
