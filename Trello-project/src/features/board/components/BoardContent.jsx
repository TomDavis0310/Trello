import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import useBoardStore from "../../../store/boardStore";
import { buildListIds, buildCardMap, normalizeDndId } from "./dragHelpers";
import useBoardDragAndDrop from "./useBoardDragAndDrop";
import ListColumn from "./ListColumn";
import CardDragOverlay from "./CardDragOverlay";

const EMPTY_ITEMS = [];

export default function BoardContent({ boardId }) {
  const allCards = useBoardStore((s) => s.cards);
  const allLists = useBoardStore((s) => s.lists);
  const createCard = useBoardStore((s) => s.createCard);
  const createList = useBoardStore((s) => s.createList);
  const deleteList = useBoardStore((s) => s.deleteList);

  const lists = useMemo(
    () =>
      allLists
        .filter((l) => String(l.boardId) === String(boardId))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [allLists, boardId],
  );

  const listIds = useMemo(() => buildListIds(lists), [lists]);
  const cardMap = useMemo(() => buildCardMap(allCards), [allCards]);

  const {
    activeItem,
    activeType,
    sensors,
    displayCardsByList,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  } = useBoardDragAndDrop({ lists, cardMap });

  const [addingFor, setAddingFor] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [listName, setListName] = useState("");
  const [filterLabel, setFilterLabel] = useState(null);

  const cardError =
    newTitle.length > 50 ? "Tiêu đề card không được quá 50 ký tự" : null;
  const listError =
    listName.length > 50 ? "Tên list không được quá 50 ký tự" : null;

  const openAdd = (listId) => {
    setAddingFor(listId);
    setNewTitle("");
  };

  const closeAdd = () => {
    setAddingFor(null);
    setNewTitle("");
  };

  const submitAdd = () => {
    if (cardError) return;
    if (!newTitle.trim()) return;
    createCard(addingFor, newTitle.trim());
    closeAdd();
  };

  const handleAddList = (e) => {
    e.preventDefault();
    if (listError) return;
    if (!listName.trim()) return;
    createList(boardId, listName.trim());
    setListName("");
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="board-columns" data-testid="board-columns">
        {filterLabel && (
          <div className="filter-bar">
            <span>Filtering by label</span>
            <button
              className="btn btn--sm btn--ghost"
              onClick={() => setFilterLabel(null)}
            >
              Clear
            </button>
          </div>
        )}

        <SortableContext
          items={listIds}
          strategy={horizontalListSortingStrategy}
        >
          {listIds.map((listId) => {
            const rawListId = normalizeDndId(listId);
            const list = lists.find((l) => String(l.id) === rawListId);
            if (!list) return null;

            const cardIds = displayCardsByList[rawListId] ?? EMPTY_ITEMS;

            return (
              <ListColumn
                key={listId}
                list={list}
                cardIds={cardIds}
                cardMap={cardMap}
                onDelete={deleteList}
                addingFor={addingFor}
                openAdd={openAdd}
                closeAdd={closeAdd}
                submitAdd={submitAdd}
                newTitle={newTitle}
                setNewTitle={setNewTitle}
                cardError={cardError}
                filterLabel={filterLabel}
                setFilterLabel={setFilterLabel}
              />
            );
          })}
        </SortableContext>

        <form className="add-list-form" onSubmit={handleAddList}>
          <input
            className="add-list-input"
            data-testid="add-list-input"
            placeholder="+ Add list"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
          />
        </form>

        <DragOverlay>
          {activeType === "card" && activeItem ? (
            <CardDragOverlay card={activeItem} />
          ) : null}
          {activeType === "list" && activeItem ? (
            <div className="board-column-wrapper drag-overlay">
              <div className="board-column">
                <h3>{activeItem.name}</h3>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
