"use client";

import { deleteProfile } from "../../actions";
import { useDict } from "@/lib/i18n/client";

export function DeleteProfileButton({
  profileId,
}: {
  profileId: string;
  profileName?: string;
  profileType?: "person" | "company";
}) {
  const t = useDict().profile;

  return (
    <form
      action={deleteProfile}
      onSubmit={(e) => {
        if (!confirm(t.deleteConfirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={profileId} />
      <button
        type="submit"
        className="text-sm px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
      >
        {t.delete}
      </button>
    </form>
  );
}
