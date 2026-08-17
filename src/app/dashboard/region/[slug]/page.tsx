import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Region, Target } from "@/lib/types";
import RegionWorkspace from "../../components/RegionWorkspace";

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: region } = await supabase
    .from("regions")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!region) {
    return (
      <div>
        <p className="text-sm text-red-600 mb-4">
          No region found for &quot;{slug}&quot;.
        </p>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to Overview
        </Link>
      </div>
    );
  }

  const { data: targets } = await supabase
    .from("targets")
    .select("*")
    .eq("region_id", region.id);

  return (
    <RegionWorkspace region={region as Region} targets={(targets ?? []) as Target[]} />
  );
}
