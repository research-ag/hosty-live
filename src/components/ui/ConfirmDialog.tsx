import * as React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  description,
  children,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  isLoading = false,
  onConfirm,
  onCancel,
  className,
}: ConfirmDialogProps) {
  const handleClose = React.useCallback(() => {
    if (!isLoading) onCancel();
  }, [isLoading, onCancel]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} className={className}>
      <div className="space-y-4">
        {description && (
          <div className="text-sm text-muted-foreground">{description}</div>
        )}
        {children}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <span className="inline-flex items-center">
                <span className="mr-2 h-4 w-4 rounded-full border-2 border-b-transparent border-current animate-spin" />
                Working...
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
