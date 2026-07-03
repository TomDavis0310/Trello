export default function BoardFilterBar({ onClear }) {
  return (
    <div className="filter-bar">
      <span>Filtering by label</span>
      <button className="btn btn--sm btn--ghost" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
