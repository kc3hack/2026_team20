import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUnsavedChanges } from "../useUnsavedChanges";

describe("useUnsavedChanges", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  it("初期状態では hasUnsavedChanges=false", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it("setHasUnsavedChanges(true) で hasUnsavedChanges=true に遷移する", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it("hasUnsavedChanges=true のとき beforeunload イベントリスナーが登録される", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("hasUnsavedChanges=false に戻すとリスナーが解除される", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    act(() => {
      result.current.setHasUnsavedChanges(false);
    });

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("beforeunload ハンドラが event.preventDefault を呼ぶ", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === "beforeunload",
    )?.[1] as EventListener;

    expect(handler).toBeDefined();

    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: "",
    } as unknown as BeforeUnloadEvent;

    handler(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("unmount 時にリスナーがクリーンアップされる", () => {
    const { result, unmount } = renderHook(() => useUnsavedChanges());

    act(() => {
      result.current.setHasUnsavedChanges(true);
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
  });

  it("showConfirmDialog の初期値は false", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    expect(result.current.showConfirmDialog).toBe(false);
  });

  it("setShowConfirmDialog で showConfirmDialog を切り替えられる", () => {
    const { result } = renderHook(() => useUnsavedChanges());

    act(() => {
      result.current.setShowConfirmDialog(true);
    });

    expect(result.current.showConfirmDialog).toBe(true);
  });
});
