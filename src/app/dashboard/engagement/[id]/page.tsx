import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Engagement } from "@/lib/types";
import EngagementDrillDown from "../../components/EngagementDrillDown";

export default async function EngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: engagement } = await supabase
    .from("engagements")
    .select("*")
    .eq("id", id)
    .single();

  if (!engagement) {
    return (
      <div>
        <p className="text-sm text-red-600 mb-4">Engagement not found.</p>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to Overview
        </Link>
      </div>
    );
  }

  const { data: region } = await supabase
    .from("regions")
    .select("name, slug")
    .eq("id", engagement.region_id)
    .single();

  let backfillOfName: string | null = null;
  if (engagement.backfill_of_id) {
    const { data: original } = await supabase
      .from("engagements")
      .select("customer_name")
      .eq("id", engagement.backfill_of_id)
      .single();
    backfillOfName = original?.customer_name ?? null;
  }

  return (
    <EngagementDrillDown
      key={engagement.id}
      initial={engagement as Engagement}
      regionName={region?.name ?? "Region"}
      regionSlug={region?.slug ?? ""}
      backfillOfName={backfillOfName}
    />
  );
}
