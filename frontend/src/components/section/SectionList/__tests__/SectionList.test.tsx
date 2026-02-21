import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SectionResponse } from "@/lib/api/types";
import type { LockState, SectionAwarenessState } from "@/lib/realtime/types";
import { SectionList } from "../SectionList";

vi.mock("@/hooks/useRealtimeSection", () => ({
  useRealtimeSection: vi.fn(() => ({
    liveContent: null,
    connectionStatus: "disconnected",
  })),
}));

const mockSections: SectionResponse[] = [
  {
    id: "section-002",
    plotId: "plot-001",
    title: "仕様",
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "仕様内容" }] }],
    },
    orderIndex: 1,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "section-001",
    plotId: "plot-001",
    title: "概要",
    content: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "概要内容" }] }],
    },
    orderIndex: 0,
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

describe("SectionList", () => {
  it("セクションが orderIndex 順にソートされて表示される", () => {
    render(<SectionList sections={mockSections} />);

    const titles = screen.getAllByRole("heading", { level: 2 });
    expect(titles[0]).toHaveTextContent("概要");
    expect(titles[1]).toHaveTextContent("仕様");
  });

  it("isLoading が true の場合、ローディング表示がされる", () => {
    render(<SectionList sections={[]} isLoading={true} />);

    expect(screen.getByTestId("section-list-loading")).toBeInTheDocument();
  });

  it("セクションが空の場合、何も表示されない", () => {
    const { container } = render(<SectionList sections={[]} />);

    expect(container.querySelector("h2")).toBeNull();
  });

  it("content が null のセクションは表示されない", () => {
    const sectionsWithNull: SectionResponse[] = [
      {
        ...mockSections[0],
        content: null,
      },
    ];

    render(<SectionList sections={sectionsWithNull} />);

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("connectionStatus が connected の場合、接続中インジケータが表示される", () => {
    render(<SectionList sections={mockSections} connectionStatus="connected" />);

    const indicator = screen.getByTestId("connection-indicator");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent("接続中");
  });

  it("connectionStatus が disconnected の場合、未接続インジケータが表示される", () => {
    render(<SectionList sections={mockSections} connectionStatus="disconnected" />);

    const indicator = screen.getByTestId("connection-indicator");
    expect(indicator).toHaveTextContent("未接続");
  });

  it("connectionStatus が未指定の場合、インジケータが表示されない", () => {
    render(<SectionList sections={mockSections} />);

    expect(screen.queryByTestId("connection-indicator")).not.toBeInTheDocument();
  });

  it("lockStates で locked-by-other のセクションに SectionLockBadge が表示される", () => {
    const lockStates = new Map<string, { lockState: LockState; lockedBy: SectionAwarenessState["user"] | null }>([
      [
        "section-001",
        {
          lockState: "locked-by-other",
          lockedBy: { id: "user-other", displayName: "他ユーザー", avatarUrl: null },
        },
      ],
    ]);

    render(<SectionList sections={mockSections} lockStates={lockStates} />);

    expect(screen.getByText("他ユーザー が編集中")).toBeInTheDocument();
  });
});
