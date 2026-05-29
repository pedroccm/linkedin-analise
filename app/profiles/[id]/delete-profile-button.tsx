"use client";

import { deleteProfile } from "../../actions";

export function DeleteProfileButton({
  profileId,
  profileName,
  profileType,
}: {
  profileId: string;
  profileName: string;
  profileType: "person" | "company";
}) {
  const label = profileType === "company" ? "this company" : "this profile";

  return (
    <form
      action={deleteProfile}
      onSubmit={(e) => {
        const ok = confirm(
          `Delete ${profileName || label}?\n\n` +
            `This permanently removes all synced posts, reactions, comments` +
            (profileType === "company" ? ", and employees" : "") +
            `. This cannot be undone.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={profileId} />
      <button
        type="submit"
        className="text-sm px-4 py-2 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-colors"
      >
        Delete
      </button>
    </form>
  );
}
