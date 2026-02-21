import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlotForm } from "./PlotForm";

describe("PlotForm", () => {
  it("空タイトルでバリデーションエラーが表示される", async () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="create" onSubmit={onSubmit} />);

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("タイトルは必須です")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("200文字超えでバリデーションエラーが表示される", async () => {
    const onSubmit = vi.fn();
    const longTitle = "あ".repeat(201);
    render(
      <PlotForm
        mode="create"
        defaultValues={{ title: longTitle, description: "", tags: [] }}
        onSubmit={onSubmit}
      />,
    );

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("200文字以内")).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("正常入力でonSubmitが呼ばれる", async () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="create" onSubmit={onSubmit} />);

    const titleInput = screen.getByPlaceholderText("Plotのタイトルを入力");
    await userEvent.type(titleInput, "テストPlot");

    const submitButton = screen.getByRole("button", { name: "Plotを作成" });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ title: "テストPlot" });
    });
  });

  it("editモードでdefaultValuesが反映される", () => {
    const onSubmit = vi.fn();
    render(
      <PlotForm
        mode="edit"
        defaultValues={{
          title: "既存タイトル",
          description: "既存の説明",
          tags: ["React", "TypeScript"],
        }}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByDisplayValue("既存タイトル")).toBeInTheDocument();
    expect(screen.getByDisplayValue("既存の説明")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("editモードでは送信ボタンが「Plotを更新」になる", () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="edit" onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Plotを更新" })).toBeInTheDocument();
  });

  it("isSubmitting中はボタンが無効化される", () => {
    const onSubmit = vi.fn();
    render(<PlotForm mode="create" onSubmit={onSubmit} isSubmitting />);

    const submitButton = screen.getByRole("button", { name: "作成中..." });
    expect(submitButton).toBeDisabled();
  });

  describe("editモードのdescription空文字処理", () => {
    it("editモードでdescriptionを空にした場合、空文字列が送信される", async () => {
      const onSubmit = vi.fn();
      render(
        <PlotForm
          mode="edit"
          defaultValues={{
            title: "既存タイトル",
            description: "既存の説明",
            tags: [],
          }}
          onSubmit={onSubmit}
        />,
      );

      const descriptionTextarea = screen.getByPlaceholderText("Plotの説明を入力");
      await userEvent.clear(descriptionTextarea);

      const submitButton = screen.getByRole("button", { name: "Plotを更新" });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "" }));
      });
    });

    it("editモードでdescriptionが空白のみの場合、空文字列が送信される", async () => {
      const onSubmit = vi.fn();
      render(
        <PlotForm
          mode="edit"
          defaultValues={{
            title: "既存タイトル",
            description: "既存の説明",
            tags: [],
          }}
          onSubmit={onSubmit}
        />,
      );

      const descriptionTextarea = screen.getByPlaceholderText("Plotの説明を入力");
      await userEvent.clear(descriptionTextarea);
      await userEvent.type(descriptionTextarea, "   ");

      const submitButton = screen.getByRole("button", { name: "Plotを更新" });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: "" }));
      });
    });

    it("createモードでdescriptionが空の場合、descriptionフィールドは送信されない", async () => {
      const onSubmit = vi.fn();
      render(<PlotForm mode="create" onSubmit={onSubmit} />);

      const titleInput = screen.getByPlaceholderText("Plotのタイトルを入力");
      await userEvent.type(titleInput, "テストPlot");

      const submitButton = screen.getByRole("button", { name: "Plotを作成" });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ title: "テストPlot" });
      });
      const callArg = onSubmit.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("description");
    });

    it("editモードでdescriptionに値がある場合、trimされた値が送信される", async () => {
      const onSubmit = vi.fn();
      render(
        <PlotForm
          mode="edit"
          defaultValues={{
            title: "既存タイトル",
            description: "",
            tags: [],
          }}
          onSubmit={onSubmit}
        />,
      );

      const descriptionTextarea = screen.getByPlaceholderText("Plotの説明を入力");
      await userEvent.type(descriptionTextarea, "  新しい説明  ");

      const submitButton = screen.getByRole("button", { name: "Plotを更新" });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ description: "新しい説明" }),
        );
      });
    });
  });

  describe("タグ機能", () => {
    it("Enterキーでタグが追加される", async () => {
      const onSubmit = vi.fn();
      render(<PlotForm mode="create" onSubmit={onSubmit} />);

      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      await userEvent.type(tagInput, "React{Enter}");

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
      });
      expect(tagInput).toHaveValue("");
    });

    it("Xボタンでタグが削除される", async () => {
      const onSubmit = vi.fn();
      render(
        <PlotForm
          mode="create"
          defaultValues={{ title: "テスト", description: "", tags: ["React", "TypeScript"] }}
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();

      const removeButton = screen.getByRole("button", { name: "タグ「React」を削除" });
      await userEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("React")).not.toBeInTheDocument();
      });
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
    });

    it("10個を超えるタグは追加されない", async () => {
      const onSubmit = vi.fn();
      const tenTags = Array.from({ length: 10 }, (_, i) => `tag${i + 1}`);
      render(
        <PlotForm
          mode="create"
          defaultValues={{ title: "テスト", description: "", tags: tenTags }}
          onSubmit={onSubmit}
        />,
      );

      for (const tag of tenTags) {
        expect(screen.getByText(tag)).toBeInTheDocument();
      }

      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      expect(tagInput).toBeDisabled();
    });

    it("重複するタグは追加されない", async () => {
      const onSubmit = vi.fn();
      render(
        <PlotForm
          mode="create"
          defaultValues={{ title: "テスト", description: "", tags: ["React"] }}
          onSubmit={onSubmit}
        />,
      );

      expect(screen.getByText("React")).toBeInTheDocument();

      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      await userEvent.type(tagInput, "React{Enter}");

      await waitFor(() => {
        const reactBadges = screen.getAllByText("React");
        expect(reactBadges).toHaveLength(1);
      });
    });

    it("カンマ区切りで複数タグを一度に追加できる", async () => {
      const onSubmit = vi.fn();
      render(<PlotForm mode="create" onSubmit={onSubmit} />);

      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      await userEvent.type(tagInput, "React, TypeScript, Next.js{Enter}");

      await waitFor(() => {
        expect(screen.getByText("React")).toBeInTheDocument();
        expect(screen.getByText("TypeScript")).toBeInTheDocument();
        expect(screen.getByText("Next.js")).toBeInTheDocument();
      });
      expect(tagInput).toHaveValue("");
    });

    it("50文字を超えるタグはバリデーションエラーが表示される", async () => {
      const onSubmit = vi.fn();
      render(<PlotForm mode="create" onSubmit={onSubmit} />);

      const longTag = "あ".repeat(51);
      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      await userEvent.type(tagInput, `${longTag}{Enter}`);

      await waitFor(() => {
        expect(screen.getByText("タグは50文字以内")).toBeInTheDocument();
      });
    });

    it("50文字ちょうどのタグは追加できる", async () => {
      const onSubmit = vi.fn();
      render(<PlotForm mode="create" onSubmit={onSubmit} />);

      const exactTag = "a".repeat(50);
      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      await userEvent.type(tagInput, `${exactTag}{Enter}`);

      await waitFor(() => {
        expect(screen.getByText(exactTag)).toBeInTheDocument();
      });
      expect(tagInput).toHaveValue("");
    });

    it("カンマ区切りで一部のタグが50文字超の場合すべて追加されない", async () => {
      const onSubmit = vi.fn();
      render(<PlotForm mode="create" onSubmit={onSubmit} />);

      const longTag = "あ".repeat(51);
      const tagInput = screen.getByPlaceholderText("例: TypeScript, React, デザイン");
      await userEvent.type(tagInput, `React, ${longTag}{Enter}`);

      await waitFor(() => {
        expect(screen.getByText("タグは50文字以内")).toBeInTheDocument();
      });
      expect(screen.queryByText("React")).not.toBeInTheDocument();
    });
  });
});
