import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
};

const DEFAULT_ERROR_MESSAGE = "エラーが発生しました";

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const displayMessage = message || DEFAULT_ERROR_MESSAGE;

  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>エラー</AlertTitle>
      <AlertDescription>
        <p>{displayMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
            再試行
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
