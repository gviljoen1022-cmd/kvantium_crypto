import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Engagement, Region, Target } from "@/lib/types";
import { horizonLabel } from "@/lib/types";
import StatusBadge from "./components/StatusBadge";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function OverviewDashboard() {
  const supabase = await createClient();

  const [regionsRes, targetsRes, engagementsRes] = await Promise.all([
    supabase.from("regions").select("*").order("name"),
    supabase.from("targets").select("*"),
    supabase
      .from("engagements")
      .select(
        "id, region_id, target_id, customer_name, horizon, status, next_action_date, locked_at"
      ),
  ]);

  const regions = (regionsRes.data ?? []) as Region[];
  const targets = (targetsRes.data ?? []) as Target[];
  const engagements = (engagementsRes.data ?? []) as Pick<
    Engagement,
    | "id"
    | "region_id"
    | "target_id"
    | "customer_name"
    | "horizon"
    | "status"
    | "next_action_date"
    | "locked_at"
  >[];

  if (regionsRes.error || targetsRes.error || engagementsRes.error) {
    return (
      <p className="text-sm text-red-600">
        Couldn&apos;t load the dashboard. Make sure the new schema.sql has
        been run in your Supabase project.
      </p>
    );
  }

  const targetById = new Map(targets.map((t) => [t.id, t]));
  const totalTarget = targets.reduce((sum, t) => sum + t.customers, 0);
  const landed = engagements.filter((e) => e.status === "Landed");
  const landed60Day = landed.filter((e) => e.horizon === "60").length;
  const revenueLanded = landed.reduce((sum, e) => {
    const t = targetById.get(e.target_id);
    return sum + (t?.revenue_target ?? 0);
  }, 0);

  const upcoming = engagements
    .filter((e) => !e.locked_at && e.next_action_date)
    .sort((a, b) => (a.next_action_date! < b.next_action_date! ? -1 : 1))
    .slice(0, 8);

  const today = todayISO();

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">
        PQC Consulting — Overview
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        Mirrors the GTM Plan&apos;s combined 12-month summary. Every figure
        below drills through to the underlying engagements.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
            {totalTarget}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Total Engagements Target
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
            {landed60Day}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            60-Day Customers Landed
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-2xl font-semibold text-neutral-900 tabular-nums">
            R {revenueLanded.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            Engagement Revenue Landed
          </div>
        </div>
      </div>

      <h2 className="text-sm font-medium text-neutral-900 mb-3">
        Progress vs Target, by Region
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {regions.map((region) => {
          const regionTargets = targets.filter((t) => t.region_id === region.id);
          const regionTotal = regionTargets.reduce((s, t) => s + t.customers, 0);
          const regionLanded = landed.filter((e) => e.region_id === region.id).length;
          const pct = regionTotal === 0 ? 0 : Math.min(100, (regionLanded / regionTotal) * 100);

          return (
            <Link
              key={region.id}
              href={`/dashboard/region/${region.slug}`}
              className="block bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-neutral-900">
                  {region.name}
                </span>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {regionLanded} / {regionTotal} landed
                </span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-neutral-900 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="text-sm font-medium text-neutral-900 mb-3">
        Upcoming Actions Due
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No open engagements have a next action date set.
        </p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white divide-y divide-neutral-100">
          {upcoming.map((e) => (
            <Link
              key={e.id}
              href={`/dashboard/engagement/${e.id}`}
              className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-neutral-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-neutral-900 truncate">{e.customer_name}</span>
                <span className="text-neutral-400 shrink-0">
                  · {horizonLabel(e.horizon)}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={e.status} />
                <span
                  className={`tabular-nums ${
                    e.next_action_date && e.next_action_date < today
                      ? "text-red-600 font-medium"
                      : "text-neutral-500"
                  }`}
                >
                  {e.next_action_date}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
