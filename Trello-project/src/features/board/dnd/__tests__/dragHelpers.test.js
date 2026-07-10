import { describe, expect, it } from "vitest";
import {
  buildCardDragPreviewState,
  resolveCardDropTargetFromClone,
} from "../preview.helpers";
import { resolveCardDropTarget } from "../dragEnd.helpers";

function createCardDnDContext({
  activeId = "1",
  overId = "2",
  activeListId = "10",
  overType = "card",
  overListId = activeListId,
  cursorY = 40,
  overTop = 0,
  overHeight = 20,
} = {}) {
  return {
    event: {
      activatorEvent: { clientY: cursorY },
      delta: { y: 0 },
    },
    active: {
      id: `card-${activeId}`,
      data: {
        current: {
          type: "card",
          listId: activeListId,
          card: { id: activeId, listId: activeListId },
        },
      },
      rect: {
        current: {
          translated: { top: 0, height: 20 },
          initial: { top: 0, height: 20 },
        },
      },
    },
    over: {
      id: overType === "list" ? `list-drop-${overListId}` : `card-${overId}`,
      data: {
        current:
          overType === "list"
            ? { type: "list", listId: overListId }
            : { type: "card", listId: overListId },
      },
      rect: {
        current: {
          translated: { top: overTop, height: overHeight },
          initial: { top: overTop, height: overHeight },
        },
      },
    },
  };
}

describe("dragHelpers", () => {
  it("reorders preview within the same list", () => {
    const { event, active, over } = createCardDnDContext({
      activeId: "1",
      overId: "2",
      cursorY: 40,
      overTop: 0,
      overHeight: 20,
    });

    const previewState = buildCardDragPreviewState({
      event,
      active,
      over,
      currentClone: {
        10: ["1", "2", "3"],
      },
    });

    expect(previewState?.nextClone).toEqual({
      10: ["2", "1", "3"],
    });
    expect(previewState?.overIndex).toBe(1);
  });

  it("reads the final drop location from the preview clone", () => {
    expect(
      resolveCardDropTargetFromClone("1", {
        10: ["2", "1", "3"],
      }),
    ).toEqual({
      targetListId: "10",
      targetIndex: 1,
      targetCards: ["2", "1", "3"],
    });
  });

  it("prefers the preview clone when resolving drag end target", () => {
    const { event, active, over } = createCardDnDContext({
      activeId: "1",
      overId: "4",
      activeListId: "10",
      overListId: "20",
      cursorY: 40,
      overTop: 0,
      overHeight: 20,
    });

    const dropTarget = resolveCardDropTarget({
      event,
      active,
      over,
      rawActiveId: "1",
      rawOverId: "4",
      cards: [
        { id: 1, listId: 10, position: 0 },
        { id: 2, listId: 10, position: 1 },
        { id: 4, listId: 20, position: 0 },
        { id: 5, listId: 20, position: 1 },
      ],
      lists: [{ id: 10 }, { id: 20 }],
      currentClone: {
        10: ["2"],
        20: ["4", "1", "5"],
      },
      sourceListId: "10",
    });

    expect(dropTarget).toMatchObject({
      targetListId: "20",
      targetIndex: 1,
      usedPreviewTarget: true,
      debugBranch: "CARD_PREVIEW_TARGET",
    });
  });

  it("falls back to geometry when preview clone cannot resolve", () => {
    const { event, active, over } = createCardDnDContext({
      activeId: "1",
      overId: "2",
      activeListId: "10",
      overListId: "10",
      cursorY: 40,
      overTop: 0,
      overHeight: 20,
    });

    const dropTarget = resolveCardDropTarget({
      event,
      active,
      over,
      rawActiveId: "1",
      rawOverId: "2",
      cards: [
        { id: 1, listId: 10, position: 0 },
        { id: 2, listId: 10, position: 1 },
        { id: 3, listId: 10, position: 2 },
      ],
      lists: [{ id: 10 }],
      currentClone: null,
      sourceListId: "10",
    });

    expect(dropTarget).toMatchObject({
      targetListId: "10",
      targetIndex: 1,
      usedPreviewTarget: false,
      debugBranch: "CARD_OVER_CARD",
    });
  });

  it("uses the exact preview clone index when self-hover would otherwise shift it", () => {
    const { event, active, over } = createCardDnDContext({
      activeId: "1",
      overId: "1",
      activeListId: "10",
      overListId: "20",
      cursorY: 60,
      overTop: 0,
      overHeight: 20,
    });

    const dropTarget = resolveCardDropTarget({
      event,
      active,
      over,
      rawActiveId: "1",
      rawOverId: "1",
      cards: [
        { id: 1, listId: 10, position: 0 },
        { id: 2, listId: 10, position: 1 },
        { id: 4, listId: 20, position: 0 },
        { id: 5, listId: 20, position: 1 },
      ],
      lists: [{ id: 10 }, { id: 20 }],
      currentClone: {
        10: ["2"],
        20: ["4", "1", "5"],
      },
      sourceListId: "10",
    });

    expect(dropTarget).toMatchObject({
      targetListId: "20",
      targetIndex: 1,
      usedPreviewTarget: true,
      debugBranch: "CARD_PREVIEW_TARGET",
    });
  });

  it("keeps the preview clone stable when self-hovering after a cross-list move", () => {
    const { event, active, over } = createCardDnDContext({
      activeId: "1",
      overId: "1",
      activeListId: "10",
      overListId: "20",
      cursorY: 60,
      overTop: 0,
      overHeight: 20,
    });

    const currentClone = {
      10: ["2"],
      20: ["4", "1", "5"],
    };

    const previewState = buildCardDragPreviewState({
      event,
      active,
      over,
      currentClone,
    });

    expect(previewState?.nextClone).toEqual(currentClone);
    expect(previewState?.overIndex).toBe(1);
  });

  it("commits to the bottom when the preview clone already places the card at bottom", () => {
    const { event, active, over } = createCardDnDContext({
      activeId: "1",
      overId: "1",
      activeListId: "10",
      overListId: "20",
      cursorY: 60,
      overTop: 0,
      overHeight: 20,
    });

    const dropTarget = resolveCardDropTarget({
      event,
      active,
      over,
      rawActiveId: "1",
      rawOverId: "1",
      cards: [
        { id: 1, listId: 10, position: 0 },
        { id: 2, listId: 10, position: 1 },
        { id: 4, listId: 20, position: 0 },
        { id: 5, listId: 20, position: 1 },
      ],
      lists: [{ id: 10 }, { id: 20 }],
      currentClone: {
        10: ["2"],
        20: ["4", "5", "1"],
      },
      sourceListId: "10",
    });

    expect(dropTarget).toMatchObject({
      targetListId: "20",
      targetIndex: 2,
      usedPreviewTarget: true,
      debugBranch: "CARD_PREVIEW_TARGET",
    });
  });
});
