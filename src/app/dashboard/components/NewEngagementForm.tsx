"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Engagement, Horizon, Region, Source, Target } from "@/lib/types";
import { HORIZONS, SOURCES, horizonLabel } from "@/lib/types";

export default function NewEngagementForm({
  region,
  targets,
  defaultHorizon,
  onCreated,
  onCancel,
}: {
  region: Region;
  targets: Target[];
  defaultHorizon: Horizon;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [customerName, setCustomerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("");
  const [objective, setObjective] = useState("");
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon);
  const [source, setSource] = useState<Source>("New Prospect");
  const [backfillOfId, setBackfillOfId] = useState("");
  const [stalled, setStalled] = useState<Pick<Engagement, "id" | "customer_name">[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (source !== "Backfill") return;
    let cancelled = false;
    supabase
      .from("engagements")
      .select("id, customer_name")
      .eq("region_id", region.id)
      .eq("status", "Stalled")
      .then(({ data }) => {
        if (!cancelled) setStalled(data ?? []);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, region.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const target = targets.find((t) => t.horizon === horizon);
    if (!target) {
      setError(`No target configured for ${horizonLabel(horizon)} in ${region.name}.`);
      return;
    }
    if (source === "Backfill" && !backfillOfId) {
      setError("Pick which stalled engagement this backfills.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("engagements").insert({
      region_id: region.id,
      target_id: target.id,
      customer_name: customerName,
      contact_name: contactName || null,
      designation: designation || null,
      objective: objective || null,
      horizon,
      source,
      backfill_of_id: source === "Backfill" ? backfillOfId : null,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-neutral-200 rounded-lg p-4 mb-5 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Customer / Organisation">
          <input
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
          />
        </Field>
        <Field label="Contact Name">
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
          />
        </Field>
        <Field label="Designation">
          <input
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
          />
        </Field>
        <Field label="Horizon">
          <select
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as Horizon)}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {horizonLabel(h)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Source">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as Source)}
            className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        {source === "Backfill" && (
          <Field label="Backfills (stalled engagement)">
            <select
              required
              value={backfillOfId}
              onChange={(e) => setBackfillOfId(e.target.value)}
              className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
            >
              <option value="">Select…</option>
              {stalled.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.customer_name}
                </option>
              ))}
            </select>
            {stalled.length === 0 && (
              <p className="text-xs text-neutral-400 mt-1">
                No stalled engagements in {region.name} yet.
              </p>
            )}
          </Field>
        )}
      </div>
      <Field label="Objective">
        <textarea
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          rows={2}
          className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm w-full"
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-neutral-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Add Engagement"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md text-sm font-medium px-4 py-1.5 text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="text-xs text-neutral-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
