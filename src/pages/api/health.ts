import type { APIRoute } from "astro";
import pg from "pg";

export const prerender = false;

export const GET: APIRoute = async () => {
  const databaseUrl = process.env.DATABASE_URL;

  const db = {
    configured: Boolean(databaseUrl),
    host: null as string | null,
    name: null as string | null,
    parsedOk: false,
    redacted: databaseUrl ? databaseUrl.replace(/\/\/[^@/]+@/, "//***@") : null,
  };

  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      db.host = parsed.host;
      db.name = parsed.pathname.replace(/^\//, "");
      db.parsedOk = Boolean(parsed.host);
    } catch {
      // URL inválida: se reporta en parsedOk / error.
    }
  }

  const auth = {
    secretConfigured: Boolean(process.env.AUTH_SECRET),
    trustHost: process.env.AUTH_TRUST_HOST || null,
    nodeEnv: process.env.NODE_ENV || null,
  };

  let tables: Record<string, unknown> | null = null;
  let error: string | null = null;

  if (databaseUrl) {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    try {
      const result = await pool.query(`
        SELECT
          (SELECT count(*) FROM users) AS usuarios,
          (SELECT count(*) FROM fincas) AS fincas,
          (SELECT count(*) FROM plantas) AS plantas,
          (SELECT count(*) FROM lecturas) AS lecturas,
          (SELECT count(*) FROM users
            WHERE LOWER(COALESCE(email, '')) = LOWER('admin@macollo.tech')) AS admin
      `);
      tables = result.rows[0];
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      await pool.end();
    }
  }

  return new Response(JSON.stringify({ db, auth, tables, error }, null, 2), {
    status: error || !db.configured ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
};
