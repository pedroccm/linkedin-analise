"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { trackEmployee } from "../../actions";
import { useDict } from "@/lib/i18n/client";

type Employee = {
  id: string;
  linkedin_url: string | null;
  full_name: string | null;
  headline: string | null;
  position_title: string | null;
  location_text: string | null;
  picture_url: string | null;
  tracked_profile_id: string | null;
};

export function EmployeeItem({
  employee,
  highlight,
}: {
  employee: Employee;
  highlight?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const p = useDict().profile;
  const isTracked = Boolean(employee.tracked_profile_id);

  function handleTrack(formData: FormData) {
    startTransition(async () => {
      await trackEmployee(formData);
      router.refresh();
    });
  }

  return (
    <li
      className={
        "bg-[var(--color-surface)] border rounded-lg p-4 flex items-center gap-4 transition-colors " +
        (highlight
          ? "border-[var(--color-success)] bg-[#0f3a1f]"
          : "border-[var(--color-border)]")
      }
    >
      {employee.picture_url ? (
        <Image
          src={employee.picture_url}
          alt=""
          width={48}
          height={48}
          className="rounded-full shrink-0"
          unoptimized
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-[var(--color-bg-2)] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">
          {employee.linkedin_url ? (
            <a
              href={employee.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="text-white no-underline hover:underline"
            >
              {employee.full_name || p.unknown}
            </a>
          ) : (
            <span>{employee.full_name || "Unknown"}</span>
          )}
        </div>
        {(employee.position_title || employee.headline) && (
          <div className="text-sm text-[var(--color-text-muted)] truncate">
            {employee.position_title || employee.headline}
          </div>
        )}
        {employee.location_text && (
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
            📍 {employee.location_text}
          </div>
        )}
      </div>
      <div className="shrink-0">
        {isTracked && employee.tracked_profile_id ? (
          <Link
            href={`/profiles/${employee.tracked_profile_id}`}
            className="text-xs px-3 py-1.5 rounded border border-[var(--color-success)] text-[var(--color-success)] no-underline hover:bg-[#0f3a1f] transition-colors"
          >
            {p.tracked}
          </Link>
        ) : (
          <form action={handleTrack}>
            <input type="hidden" name="employee_id" value={employee.id} />
            <button
              type="submit"
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] hover:border-[var(--color-accent-2)] hover:text-white text-[var(--color-text-muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? p.adding : p.track}
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
