export function getDatabaseConnectionConfig(connectionString, caCertificate = "") {
  const url = new URL(connectionString);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL debe ser una URL de PostgreSQL.");
  }

  for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"]) {
    url.searchParams.delete(parameter);
  }

  return {
    connectionString: url.toString(),
    ssl: caCertificate
      ? { ca: caCertificate, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
  };
}
