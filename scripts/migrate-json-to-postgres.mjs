import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Configura DATABASE_URL con la URL externa de PostgreSQL antes de migrar.");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DATABASE_SSL === "true" ? true : undefined,
});

function readJsonFile(fileName) {
  return readFile(path.join(root, "data", fileName), "utf8").then((content) => {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error(`data/${fileName} debe contener una lista JSON.`);
    }
    return data;
  });
}

try {
  const [rawGuests, expenses] = await Promise.all([
    readJsonFile("guests.json"),
    readJsonFile("expenses.json"),
  ]);
  const guests = rawGuests.map((guest) => {
    const { firstName, lastName, ...guestData } = guest;
    return {
      ...guestData,
      name: guest.name ?? [firstName, lastName].filter(Boolean).join(" ").trim(),
      symbolicInvitation: guest.symbolicInvitation ?? false,
      isChild: guest.isChild ?? false,
      weddingRole: guest.weddingRole ?? "none",
    };
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS wedding_data (
        singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
        guests JSONB NOT NULL DEFAULT '[]'::jsonb,
        expenses JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `);
    await client.query("INSERT INTO wedding_data (singleton) VALUES (TRUE) ON CONFLICT (singleton) DO NOTHING");
    const { rows } = await client.query(
      "SELECT guests, expenses FROM wedding_data WHERE singleton = TRUE FOR UPDATE",
    );
    if (rows[0].guests.length > 0 || rows[0].expenses.length > 0) {
      throw new Error("La base ya contiene datos; no se realizó ninguna modificación.");
    }
    await client.query(
      "UPDATE wedding_data SET guests = $1::jsonb, expenses = $2::jsonb WHERE singleton = TRUE",
      [JSON.stringify(guests), JSON.stringify(expenses)],
    );
    await client.query("COMMIT");
    console.log(`Migración completada: ${guests.length} invitados y ${expenses.length} conceptos de gasto.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
