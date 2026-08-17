"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Action, ActionType, Status } from "@/lib/types";
import { ACTION_TYPES, STATUSES } from "@/lib/types";
import StatusBadge from "./StatusBadge";

// Shared append-only feed + form, used for both the full Activity Log tab
// and the Notes tab (fixedType="note"). Every write goes through `actions`
// — nothing here ever updates engagements directly.
export default function ActivityLog({
  engagementId,
  locked,
  fixedType,
  emptyLabel,
  onLogged,
}: {
  engagementId: string;
  locked: boolean;
  fixedType?: ActionType;
  emptyLabel: string;
  onLogged: () => void;
}) {
  const supabase = createClient();
  const [entries, setEntries] = useState<Action[] | null>(null);
  const [type, setType] = useState<ActionType>(fixedType ?? "call");
  const [description, setDescription] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [statusTo, setStatusTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    let query = supabase
      .from("actions")
      .select("*")
      .eq("engagement_id", engagementId)
      .order("occurred_at", { ascending: false });
    if (fixedType) query = query.eq("type", fixedType);
    const { data } = await query;
    setEntries((data ?? []) as Action[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount/id change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId, fixedType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("actions").insert({
      engagement_id: engagementId,
      type: fixedType ?? type,
      description,
      status_to: statusTo || null,
      next_action_date: nextActionDate || null,
      created_by: user?.email ?? null,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setDescription("");
    setNextActionDate("");
    setStatusTo("");
    load();
    onLogged();
  }

  return (
    <div>
      {!locked && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-neutral-200 rounded-lg p-4 mb-5 space-y-3"
        >
          <div className="flex flex-wrap gap-3">
            {!fixedType && (
              <div className="flex flex-col">
                <label className="text-xs text-neutral-500 mb-1">Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ActionType)}
                  className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
                >
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Next action date</label>
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-neutral-500 mb-1">Update status to</label>
              <select
                value={statusTo}
                onChange={(e) => setStatusTo(e.target.value)}
                className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
              >
                <option value="">No change</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-neutral-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving ? "Logging…" : "Log Activity"}
          </button>
        </form>
      )}

      {entries === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
          {entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  {entry.type}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(entry.occurred_at).toLocaleString()}
                  {entry.created_by ? ` · ${entry.created_by}` : ""}
                </span>
              </div>
              <p className="text-neutral-800">{entry.description}</p>
              {(entry.status_to || entry.next_action_date) && (
                <div className="flex items-center gap-2 mt-2">
                  {entry.status_to && <StatusBadge status={entry.status_to as Status} />}
                  {entry.next_action_date && (
                    <span className="text-xs text-neutral-500">
                      Next action: {entry.next_action_date}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
