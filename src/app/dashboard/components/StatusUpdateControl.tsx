"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Status } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import StatusBadge from "./StatusBadge";

// Inline "log a status change" control. Never writes engagements.status
// directly — it inserts an actions row with status_to set, and the
// sync_engagement_status DB trigger derives the new status from that.
export default function StatusUpdateControl({
  engagementId,
  status,
  locked,
  onChanged,
}: {
  engagementId: string;
  status: Status;
  locked: boolean;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<Status>(status);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (locked) return <StatusBadge status={status} />;

  if (!open) {
    return (
      <button
        onClick={() => {
          setNextStatus(status);
          setOpen(true);
        }}
        className="hover:opacity-70"
        title="Log a status change"
      >
        <StatusBadge status={status} />
      </button>
    );
  }

  async function handleSave() {
    if (!note.trim()) {
      setError("Add a short note for this update.");
      return;
    }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from("actions").insert({
      engagement_id: engagementId,
      type: "note",
      description: note,
      status_to: nextStatus !== status ? nextStatus : null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNote("");
    setOpen(false);
    onChanged();
  }

  return (
    <div className="flex flex-col gap-1 bg-neutral-50 border border-neutral-200 rounded-md p-2 -m-2">
      <select
        value={nextStatus}
        onChange={(e) => setNextStatus(e.target.value as Status)}
        className="border border-neutral-300 rounded px-1.5 py-1 text-xs"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (required)"
        className="border border-neutral-300 rounded px-1.5 py-1 text-xs w-48"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs font-medium bg-neutral-900 text-white rounded px-2 py-1 disabled:opacity-50"
        >
          {saving ? "Logging…" : "Log"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
