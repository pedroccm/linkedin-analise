"use client";

import { useFormStatus } from "react-dom";

// Submit button for server-action forms. Shows a pending label and disables
// itself while the action (and its redirect) is in flight, so the user gets
// immediate feedback instead of a dead-looking button.
export function SubmitButton({
  idle,
  pending,
  className,
}: {
  idle: string;
  pending: string;
  className?: string;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className={
        (className ?? "") +
        " disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-2"
      }
    >
      {isPending && (
        <span className="inline-block h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      )}
      {isPending ? pending : idle}
    </button>
  );
}
