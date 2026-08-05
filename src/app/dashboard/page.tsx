import { createClient } from "@/lib/supabase/server";
import ProjectTabs from "./components/ProjectTabs";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, description")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error || !project) {
    return (
      <p className="text-sm text-red-600">
        Couldn&apos;t load the project. Make sure schema.sql has been run in
        your Supabase project (see README, step 2).
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">
        {project.name}
      </h1>
      <p className="text-sm text-neutral-500 mb-6">{project.description}</p>

      <ProjectTabs projectId={project.id} />
    </div>
  );
}
