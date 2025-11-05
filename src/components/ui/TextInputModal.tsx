import React, { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { Loader2 } from "lucide-react";

export type TextInputModalProps = {
  isOpen: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string | null;
  submitText?: string;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void> | void;
};

export function TextInputModal({
  isOpen,
  title,
  label,
  placeholder,
  initialValue,
  submitText = "Submit",
  onClose,
  onSubmit,
}: TextInputModalProps) {
  const [value, setValue] = useState<string>(initialValue ?? "");
  const [isWorking, setIsWorking] = useState(false);
  const normalizedInitial = useMemo(() => initialValue ?? "", [initialValue]);

  useEffect(() => {
    if (isOpen) setValue(normalizedInitial);
  }, [isOpen, normalizedInitial]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      setIsWorking(true);
      await Promise.resolve(onSubmit(value));
      onClose();
    } catch (err) {
      // Swallow error here; parent is expected to show a toast if needed
      console.error("TextInputModal submit error", err);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isWorking ? () => {} : onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">{label}</label>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={isWorking}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isWorking}>
            Cancel
          </Button>
          <Button type="submit" disabled={isWorking}>
            {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isWorking ? "Working" : submitText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
