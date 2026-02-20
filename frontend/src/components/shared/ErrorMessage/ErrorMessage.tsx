import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import styles from "./ErrorMessage.module.scss";

type ErrorMessageProps = {
  title?: string;
  message?: string;
  errorCode?: string | number;
  onRetry?: () => void;
};

const DEFAULT_ERROR_MESSAGE = "エラーが発生しました";

export function ErrorMessage({ title = "エラー", message, errorCode, onRetry }: ErrorMessageProps) {
  const displayMessage = message || DEFAULT_ERROR_MESSAGE;

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {title}
        {errorCode && <span className={styles.errorCode}>({errorCode})</span>}
      </AlertTitle>
      <AlertDescription className={styles.description}>
        <p>{displayMessage}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className={styles.retryButton}>
            再試行
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
