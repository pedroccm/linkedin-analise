"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { addTagToProfile, removeTagFromProfile } from "../../tag-actions";

type Tag = { id: string; name: string };

export function ProfileTags({
  profileId,
  tags: initialTags,
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
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reconcile optimistic state with the server truth after a refresh.
  const serverKey = initialTags.map((t) => t.id).join(",");
  useEffect(() => {
    setTags(initialTags);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  function add() {
    const name = value.trim();
    if (!name || isPending) return;
    // Already attached? just close.
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setValue("");
      setOpen(false);
      return;
    }
    // Optimistic chip (temp id) so it feels instant.
    setTags((prev) => [...prev, { id: `tmp-${name}`, name }]);
    setValue("");
    setOpen(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("profile_id", profileId);
      fd.set("tag_name", name);
      await addTagToProfile(fd);
      router.refresh();
    });
  }

  function remove(tagId: string) {
    if (isPending) return;
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("profile_id", profileId);
      fd.set("tag_id", tagId);
      await removeTagFromProfile(fd);
      router.refresh();
    });
  }

  const attachedNames = new Set(tags.map((t) => t.name.toLowerCase()));
  const suggestions = allTags.filter((t) => !attachedNames.has(t.name.toLowerCase()));

  return (
    <div
      className={
        "flex items-center gap-1.5 flex-wrap mt-3 transition-opacity " +
        (isPending ? "opacity-60 pointer-events-none" : "")
      }
      aria-busy={isPending}
    >
      {tags.map((t) => {
        const temp = t.id.startsWith("tmp-");
        return (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-[var(--color-accent-2)] text-[var(--color-accent-2)]"
          >
            {t.name}
            {temp ? (
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-[var(--color-accent-2)]/40 border-t-[var(--color-accent-2)] animate-spin" />
            ) : (
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="hover:text-white"
                aria-label="remove"
              >
                ×
              </button>
            )}
          </span>
        );
      })}

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
        <div className="inline-flex items-center gap-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            list="lia-tag-suggestions"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              } else if (e.key === "Escape") {
                setValue("");
                setOpen(false);
              }
            }}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg)] outline-none focus:border-[var(--color-accent-2)] w-36"
          />
          <button
            type="button"
            onClick={add}
            disabled={!value.trim()}
            className="text-xs px-2 py-1 rounded bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] disabled:opacity-40 text-white"
            aria-label="add tag"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setValue("");
              setOpen(false);
            }}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-white"
            aria-label="cancel"
          >
            ×
          </button>
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
