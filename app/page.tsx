import { DashboardApp } from "@/components/dashboard-app";
import { requireAdminPage } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { isDatabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export default async function Home() {
  const session = await requireAdminPage();

  if (!isDatabaseConfigured()) {
    return (
      <main className="content">
        <section className="panel">
          <h2>Banco ainda não conectado</h2>
          <p>
            Defina <code>SUPABASE_URL</code> e <code>SUPABASE_SERVICE_ROLE_KEY</code> nas
            Environment Variables da Vercel.
          </p>
        </section>
      </main>
    );
  }

  try {
    const data = await getDashboardData();
    return <DashboardApp initialData={data} userName={session.name} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao ler o banco";
    return (
      <main className="content">
        <section className="panel">
          <h2>Não foi possível abrir o painel</h2>
          <p>{message}</p>
        </section>
      </main>
    );
  }
}

