"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { addTagToProfile, removeTagFromProfile } from "../../tag-actions";

type Tag = { id: string; name: string };

export function ProfileTags({
  profileId,
  tags,
  allTags,
  addLabel,
  placeholder,
}: {
  profileId: string;
  tags: Tag[];
  allTags: Tag[];
  addLabel: string;
  placeholder: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const attachedIds = new Set(tags.map((t) => t.id));
  const suggestions = allTags.filter((t) => !attachedIds.has(t.id));

  async function add(name: string) {
    if (!name.trim()) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("profile_id", profileId);
    fd.set("tag_name", name.trim());
    await addTagToProfile(fd);
    setBusy(false);
    setOpen(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function remove(tagId: string) {
    const fd = new FormData();
    fd.set("profile_id", profileId);
    fd.set("tag_id", tagId);
    await removeTagFromProfile(fd);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-3">
      {tags.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-[var(--color-accent-2)] text-[var(--color-accent-2)]"
        >
          {t.name}
          <button
            type="button"
            onClick={() => remove(t.id)}
            className="hover:text-white"
            aria-label="remove"
          >
            ×
          </button>
        </span>
      ))}

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="text-xs px-2 py-0.5 rounded-full border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white hover:border-[var(--color-accent-2)]"
        >
          {addLabel}
        </button>
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            disabled={busy}
            placeholder={placeholder}
            list="lia-tag-suggestions"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add((e.target as HTMLInputElement).value);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            onBlur={(e) => {
              // attach on blur if there's a value, else close
              const v = e.target.value;
              if (v.trim()) add(v);
              else setOpen(false);
            }}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] outline-none focus:border-[var(--color-accent-2)] w-40"
          />
          <datalist id="lia-tag-suggestions">
            {suggestions.map((t) => (
              <option key={t.id} value={t.name} />
            ))}
          </datalist>
        </div>
      )}
    </div>
  );
}
