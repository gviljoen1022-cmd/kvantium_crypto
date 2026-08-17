"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Engagement, Horizon, Region, Target } from "@/lib/types";
import { horizonLabel } from "@/lib/types";
import EngagementTable from "./EngagementTable";
import NewEngagementForm from "./NewEngagementForm";

type Tab = "60" | "90-120" | "all";

export default function RegionWorkspace({
  region,
  targets,
}: {
  region: Region;
  targets: Target[];
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>("60");
  const [engagements, setEngagements] = useState<Engagement[] | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("engagements")
      .select("*")
      .eq("region_id", region.id)
      .order("created_at", { ascending: false });
    setEngagements((data ?? []) as Engagement[]);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount/id change
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.id]);

  const filtered =
    engagements === null
      ? []
      : tab === "all"
      ? engagements
      : engagements.filter((e) => e.horizon === tab);

  const activeTarget = tab === "all" ? null : targets.find((t) => t.horizon === tab);
  const landedInTab = filtered.filter((e) => e.status === "Landed").length;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Overview
      </Link>
      <h1 className="text-lg font-semibold text-neutral-900 mt-2">{region.name}</h1>
      <p className="text-sm text-neutral-500 mb-6">
        {activeTarget
          ? `Target: ${activeTarget.customers} customers landed, ${activeTarget.licenses} shared-instance licenses.`
          : "All engagements across both horizons."}
      </p>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex gap-1">
          {(["60", "90-120", "all"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-md ${
                tab === t
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {t === "all" ? "All" : horizonLabel(t as Horizon)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-neutral-800"
        >
          {adding ? "Close" : "+ New Engagement"}
        </button>
      </div>

      {activeTarget && (
        <p className="text-xs text-neutral-400 mb-4">
          {landedInTab} / {activeTarget.customers} landed in this horizon
        </p>
      )}

      {adding && (
        <NewEngagementForm
          region={region}
          targets={targets}
          defaultHorizon={tab === "all" ? "60" : (tab as Horizon)}
          onCreated={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {engagements === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : (
        <EngagementTable
          rows={filtered}
          emptyLabel="No engagements in this view yet."
          onChanged={load}
        />
      )}
    </div>
  );
}
