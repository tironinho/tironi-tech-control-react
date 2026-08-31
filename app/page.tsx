import { DashboardApp } from "@/components/dashboard-app";
import { getDashboardData } from "@/lib/dashboard";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export default async function Home() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="content">
        <section className="panel">
          <h2>Banco ainda não conectado</h2>
          <p>
            Defina <code>POSTGRES_URL</code> ou <code>DATABASE_URL</code> nas
            Environment Variables da Vercel com a URI do Transaction pooler.
          </p>
        </section>
      </main>
    );
  }

  try {
    const data = await getDashboardData();
    return <DashboardApp initialData={data} />;
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
