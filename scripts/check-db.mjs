import "dotenv/config";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Falta DATABASE_URL. Pásala por entorno o ponla en .env.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

async function check(label, sql) {
  try {
    const result = await pool.query(sql);
    console.log(`\n${label}`);
    console.table(result.rows);
  } catch (error) {
    console.log(`\n${label}`);
    console.log(`  ERROR: ${error.message}`);
  }
}

console.log("Revisando la BD apuntada por DATABASE_URL...");

await check(
  "Admin:",
  `
  SELECT id, email, role,
         CASE WHEN password ~ '^\\$2' THEN 'bcrypt' ELSE COALESCE(password, 'sin password') END AS password
  FROM users
  WHERE LOWER(COALESCE(email, '')) = LOWER('admin@macollo.tech')
`,
);

await check(
  "Conteos:",
  `
  SELECT
    (SELECT count(*) FROM users) AS usuarios,
    (SELECT count(*) FROM fincas) AS fincas,
    (SELECT count(*) FROM plantas) AS plantas,
    (SELECT count(*) FROM lecturas) AS lecturas
`,
);

await pool.end();
