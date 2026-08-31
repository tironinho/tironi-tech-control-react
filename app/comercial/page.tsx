import { WorkspaceApp } from "@/components/workspace-app";
import { requireWorkspace } from "@/lib/auth";
import { getPipelineData } from "@/lib/dashboard";
import { isDatabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export default async function ComercialPage() {
  const session = await requireWorkspace("comercial");
  if (!isDatabaseConfigured()) {
    return (
      <main className="content">
        <section className="panel">
          <h2>Banco ainda não conectado</h2>
        </section>
      </main>
    );
  }
  const data = await getPipelineData();
  return <WorkspaceApp area="comercial" userName={session.name} data={data} />;
}
