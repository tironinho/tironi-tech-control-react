import { DashboardApp } from "@/components/dashboard-app";
import { getDashboardData } from "@/lib/dashboard";
import { isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isDatabaseConfigured()) {
    return (
      <main className="content">
        <section className="panel">
          <h2>Banco ainda não conectado</h2>
          <p>
            O schema e os dados da Tironi Tech já existem no Postgres. Defina
            <code> DATABASE_URL </code>
            ou <code> POSTGRES_URL </code>
            no <code>.env.local</code> e nas Environment Variables da Vercel com a URI do
            Transaction pooler do Supabase.
          </p>
        </section>
      </main>
    );
  }

  const data = await getDashboardData();
  return <DashboardApp initialData={data} />;
}
