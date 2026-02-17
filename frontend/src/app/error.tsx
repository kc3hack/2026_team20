"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p>{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="underline hover:text-primary transition-colors"
      >
        再試行
      </button>
    </div>
  );
}
