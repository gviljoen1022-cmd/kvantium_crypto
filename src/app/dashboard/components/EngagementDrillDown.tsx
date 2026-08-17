"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Engagement } from "@/lib/types";
import { horizonLabel } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import ActivityLog from "./ActivityLog";
import ArtifactsTab from "./ArtifactsTab";
import PipelineLinkTab from "./PipelineLinkTab";

const TABS = ["Activity Log", "Artifacts", "Notes", "Pipeline Link"] as const;
type Tab = (typeof TABS)[number];

export default function EngagementDrillDown({
  initial,
  regionName,
  regionSlug,
  backfillOfName,
}: {
  initial: Engagement;
  regionName: string;
  regionSlug: string;
  backfillOfName: string | null;
}) {
  const supabase = createClient();
  // `key={initial.id}` on the caller remounts this component per engagement,
  // so `initial` never changes under an existing instance.
  const [engagement, setEngagement] = useState<Engagement>(initial);
  const [tab, setTab] = useState<Tab>("Activity Log");

  async function reload() {
    const { data } = await supabase
      .from("engagements")
      .select("*")
      .eq("id", initial.id)
      .single();
    if (data) setEngagement(data as Engagement);
  }

  const locked = !!engagement.locked_at;

  return (
    <div>
      <Link
        href={`/dashboard/region/${regionSlug}`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← {regionName}
      </Link>

      <div className="flex items-center gap-3 mt-2 mb-1 flex-wrap">
        <h1 className="text-lg font-semibold text-neutral-900">
          {engagement.customer_name}
        </h1>
        <StatusBadge status={engagement.status} />
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        {[engagement.contact_name, engagement.designation, regionName, horizonLabel(engagement.horizon)]
          .filter(Boolean)
          .join(" · ")}
        {"  ·  Source: "}
        {engagement.source}
        {backfillOfName ? ` (was ${backfillOfName})` : ""}
      </p>

      {locked && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 text-sm text-green-800">
          This engagement is <strong>Landed</strong> and locked as of{" "}
          {new Date(engagement.locked_at!).toLocaleDateString()}. Revenue tracking now
          continues in the invoicing / delivery forecast — this record no longer changes.
        </div>
      )}

      <div className="flex gap-1 border-b border-neutral-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t
                ? "border-neutral-900 text-neutral-900 font-medium"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Activity Log" && (
        <ActivityLog
          engagementId={engagement.id}
          locked={locked}
          emptyLabel="No activity logged yet."
          onLogged={reload}
        />
      )}
      {tab === "Artifacts" && (
        <ArtifactsTab engagementId={engagement.id} locked={locked} />
      )}
      {tab === "Notes" && (
        <ActivityLog
          engagementId={engagement.id}
          locked={locked}
          fixedType="note"
          emptyLabel="No notes yet."
          onLogged={reload}
        />
      )}
      {tab === "Pipeline Link" && <PipelineLinkTab />}
    </div>
  );
}
