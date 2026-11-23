import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "Falta DATABASE_URL. Pon tu cadena de Neon en .env o exporta la variable antes de correr este comando.",
  );
  process.exit(1);
}

function run(script) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts", script)],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function main() {
  console.log("→ Creando tablas de autenticación...");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await pool.query(
      readFileSync(path.join(root, "src/db/auth-schema.sql"), "utf8"),
    );
    console.log("✓ Tablas de autenticación listas.");
  } finally {
    await pool.end();
  }

  console.log("→ Creando tablas de fincas, plantas y lecturas...");
  run("migrate-neon.mjs");

  console.log("→ Sembrando administrador y datos de ejemplo...");
  run("seed-production.mjs");

  console.log("\n✓ Base de datos lista. Ahora entra a /landing en Vercel.");
}

main().catch((error) => {
  console.error("Error preparando Neon:", error);
  process.exitCode = 1;
});
