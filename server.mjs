import { createServer } from "node:http";
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createServer as createViteServer } from "vite";
import { getDatabaseConnectionConfig } from "./database-connection.mjs";

const { Pool } = pg;
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
const dataFile = path.join(dataDirectory, "guests.json");
const expensesFile = path.join(dataDirectory, "expenses.json");
const production = process.argv.includes("--production");
const port = Number(process.env.PORT) || (production ? 4173 : 5173);
const database = process.env.DATABASE_URL
  ? new Pool(process.env.DATABASE_SSL === "true"
      ? getDatabaseConnectionConfig(process.env.DATABASE_URL, process.env.DATABASE_CA_CERT)
      : { connectionString: process.env.DATABASE_URL })
  : null;
const authEnabled = production || Boolean(process.env.APP_PASSWORD);
const appUsername = process.env.APP_USERNAME || "";
const appPassword = process.env.APP_PASSWORD || "";
const sessionSecret = process.env.APP_SESSION_SECRET || "";
const sessionDurationSeconds = 12 * 60 * 60;
const loginWindowMilliseconds = 15 * 60 * 1000;
const maxFailedLogins = 10;
const failedLogins = new Map();

if (production) {
  if (!database) throw new Error("DATABASE_URL es obligatorio en producción.");
  if (process.env.DATABASE_SSL !== "true") throw new Error("DATABASE_SSL=true es obligatorio en producción.");
  if (!appUsername || appPassword.length < 16 || sessionSecret.length < 32) {
    throw new Error("Configura APP_USERNAME, APP_PASSWORD (mínimo 16 caracteres) y APP_SESSION_SECRET (mínimo 32 caracteres).");
  }
}
if (authEnabled && (!appUsername || appPassword.length < 16 || sessionSecret.length < 32)) {
  throw new Error("La autenticación requiere APP_USERNAME, APP_PASSWORD (mínimo 16 caracteres) y APP_SESSION_SECRET (mínimo 32 caracteres).");
}

let guests = [];
let expenses = [];

if (database) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS wedding_data (
      singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
      guests JSONB NOT NULL DEFAULT '[]'::jsonb,
      expenses JSONB NOT NULL DEFAULT '[]'::jsonb
    )
  `);
  await database.query("INSERT INTO wedding_data (singleton) VALUES (TRUE) ON CONFLICT (singleton) DO NOTHING");
  const { rows } = await database.query("SELECT guests, expenses FROM wedding_data WHERE singleton = TRUE");
  guests = rows[0].guests;
  expenses = rows[0].expenses;
} else {
  await mkdir(dataDirectory, { recursive: true });
  try {
    guests = JSON.parse(await readFile(dataFile, "utf8"));
    if (!Array.isArray(guests)) {
      throw new Error("El archivo de invitados debe contener una lista JSON.");
    }
    const needsNameMigration = guests.some((guest) => "firstName" in guest || "lastName" in guest);
    guests = guests.map((guest) => {
      const { firstName, lastName, ...guestData } = guest;
      return {
        ...guestData,
        name: guest.name ?? [firstName, lastName].filter(Boolean).join(" ").trim(),
        symbolicInvitation: guest.symbolicInvitation ?? false,
        isChild: guest.isChild ?? false,
        weddingRole: guest.weddingRole ?? "none",
      };
    });
    if (needsNameMigration) {
      await writeFile(dataFile, `${JSON.stringify(guests, null, 2)}\n`, "utf8");
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      guests = [];
      await writeFile(dataFile, "[]\n", "utf8");
    } else {
      throw new Error(`No se pudo leer ${dataFile}: ${error.message}`, { cause: error });
    }
  }

  try {
    expenses = JSON.parse(await readFile(expensesFile, "utf8"));
    if (!Array.isArray(expenses)) {
      throw new Error("El archivo de gastos debe contener una lista JSON.");
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      expenses = [];
      await writeFile(expensesFile, "[]\n", "utf8");
    } else {
      throw new Error(`No se pudo leer ${expensesFile}: ${error.message}`, { cause: error });
    }
  }
}

async function saveGuests(nextGuests = guests) {
  if (database) {
    await database.query("UPDATE wedding_data SET guests = $1::jsonb WHERE singleton = TRUE", [JSON.stringify(nextGuests)]);
    return;
  }
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(nextGuests, null, 2)}\n`, "utf8");
  await rename(temporaryFile, dataFile);
}

async function saveExpenses(nextExpenses = expenses) {
  if (database) {
    await database.query("UPDATE wedding_data SET expenses = $1::jsonb WHERE singleton = TRUE", [JSON.stringify(nextExpenses)]);
    return;
  }
  const temporaryFile = `${expensesFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(nextExpenses, null, 2)}\n`, "utf8");
  await rename(temporaryFile, expensesFile);
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readRequestBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) {
      throw new Error("La solicitud es demasiado grande.");
    }
  }
  return JSON.parse(body);
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : "";
}

function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({
    username: appUsername,
    expiresAt: Date.now() + sessionDurationSeconds * 1000,
  })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function hasValidSession(request) {
  if (!authEnabled) return true;
  const [payload, signature, extra] = getCookie(request, "wedding_session").split(".");
  if (!payload || !signature || extra) return false;
  const expectedSignature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  if (!safeEqual(signature, expectedSignature)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.username === appUsername && Number.isFinite(session.expiresAt) && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function setSessionCookie(response, token, maxAge) {
  const secure = production ? "; Secure" : "";
  response.setHeader(
    "set-cookie",
    `wedding_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`,
  );
}

function getLoginAttempt(ip) {
  const attempt = failedLogins.get(ip);
  if (!attempt || Date.now() - attempt.startedAt >= loginWindowMilliseconds) {
    return { startedAt: Date.now(), count: 0 };
  }
  return attempt;
}

async function handleAuthApi(request, response, url) {
  if (url.pathname === "/api/auth/session" && request.method === "GET") {
    sendJson(response, 200, {
      authenticated: hasValidSession(request),
      authenticationEnabled: authEnabled,
    });
    return;
  }

  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const forwardedIp = request.headers["x-forwarded-for"];
    const ip = (typeof forwardedIp === "string" ? forwardedIp.split(",")[0].trim() : "")
      || request.socket.remoteAddress
      || "unknown";
    const attempt = getLoginAttempt(ip);
    if (attempt.count >= maxFailedLogins) {
      response.setHeader("retry-after", Math.ceil((attempt.startedAt + loginWindowMilliseconds - Date.now()) / 1000));
      sendJson(response, 429, { error: "Demasiados intentos. Espera 15 minutos antes de volver a intentarlo." });
      return;
    }

    const body = await readRequestBody(request);
    const usernameMatches = typeof body?.username === "string" && safeEqual(body.username, appUsername);
    const passwordMatches = typeof body?.password === "string" && safeEqual(body.password, appPassword);
    if (!usernameMatches || !passwordMatches) {
      failedLogins.set(ip, { ...attempt, count: attempt.count + 1 });
      sendJson(response, 401, { error: "Usuario o contraseña incorrectos." });
      return;
    }

    failedLogins.delete(ip);
    setSessionCookie(response, createSessionToken(), sessionDurationSeconds);
    sendJson(response, 200, { authenticated: true });
    return;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    setSessionCookie(response, "", 0);
    response.writeHead(204, { "cache-control": "no-store" });
    response.end();
    return;
  }

  sendJson(response, 404, { error: "Ruta no encontrada." });
}

function validateGuest(value) {
  const genders = ["female", "male", "other", "undisclosed"];
  const weddingRoles = ["none", "bestMan", "bridesmaid"];
  return value !== null
    && typeof value === "object"
    && typeof value.name === "string"
    && value.name.trim().length > 0
    && typeof value.invitedBy === "string"
    && typeof value.hasPlusOne === "boolean"
    && typeof value.plusOneName === "string"
    && typeof value.confirmed === "boolean"
    && typeof value.symbolicInvitation === "boolean"
    && typeof value.isChild === "boolean"
    && weddingRoles.includes(value.weddingRole)
    && genders.includes(value.gender);
}

function validateExpense(value) {
  return value !== null
    && typeof value === "object"
    && typeof value.concept === "string"
    && value.concept.trim().length > 0
    && typeof value.responsible === "string"
    && typeof value.phone === "string"
    && (value.pricePerPerson === null
      || (typeof value.pricePerPerson === "number" && Number.isFinite(value.pricePerPerson) && value.pricePerPerson >= 0))
    && typeof value.fixedAmount === "number"
    && Number.isFinite(value.fixedAmount)
    && value.fixedAmount >= 0;
}

function validatePayment(value) {
  const parsedDate = typeof value?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    ? new Date(`${value.date}T00:00:00Z`)
    : null;
  return value !== null
    && typeof value === "object"
    && typeof value.amount === "number"
    && Number.isFinite(value.amount)
    && value.amount > 0
    && typeof value.date === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(value.date)
    && parsedDate !== null
    && !Number.isNaN(parsedDate.getTime())
    && parsedDate.toISOString().slice(0, 10) === value.date
    && typeof value.note === "string";
}

async function handleApi(request, response, url) {
  if (url.pathname === "/api/guests" && request.method === "GET") {
    sendJson(response, 200, guests);
    return;
  }

  if (url.pathname === "/api/guests" && request.method === "POST") {
    const body = await readRequestBody(request);
    if (!validateGuest(body)) {
      sendJson(response, 400, { error: "Revisa los datos del invitado e inténtalo de nuevo." });
      return;
    }
    const guest = { ...body, id: randomUUID() };
    const nextGuests = [...guests, guest];
    await saveGuests(nextGuests);
    guests = nextGuests;
    sendJson(response, 201, guest);
    return;
  }

  if (url.pathname === "/api/expenses" && request.method === "GET") {
    sendJson(response, 200, expenses);
    return;
  }

  if (url.pathname === "/api/expenses" && request.method === "POST") {
    const body = await readRequestBody(request);
    if (!validateExpense(body)) {
      sendJson(response, 400, { error: "Revisa los datos del concepto e inténtalo de nuevo." });
      return;
    }
    const expense = { ...body, id: randomUUID(), payments: [] };
    const nextExpenses = [...expenses, expense];
    await saveExpenses(nextExpenses);
    expenses = nextExpenses;
    sendJson(response, 201, expense);
    return;
  }

  const paymentMatch = url.pathname.match(/^\/api\/expenses\/([^/]+)\/payments(?:\/([^/]+))?$/);
  if (paymentMatch) {
    const expenseId = decodeURIComponent(paymentMatch[1]);
    const expenseIndex = expenses.findIndex((expense) => expense.id === expenseId);
    if (expenseIndex < 0) {
      sendJson(response, 404, { error: "No se encontró ese concepto de gasto." });
      return;
    }

    if (!paymentMatch[2] && request.method === "POST") {
      const body = await readRequestBody(request);
      if (!validatePayment(body)) {
        sendJson(response, 400, { error: "Revisa el importe, la fecha y la nota del pago." });
        return;
      }
      const payment = { ...body, id: randomUUID() };
      const currentExpense = expenses[expenseIndex];
      const nextExpenses = expenses.map((expense, index) => index === expenseIndex
        ? { ...expense, payments: [...expense.payments, payment] }
        : expense);
      await saveExpenses(nextExpenses);
      expenses = nextExpenses;
      sendJson(response, 201, payment);
      return;
    }

    if (paymentMatch[2] && request.method === "DELETE") {
      const paymentId = decodeURIComponent(paymentMatch[2]);
      const paymentIndex = expenses[expenseIndex].payments.findIndex((payment) => payment.id === paymentId);
      if (paymentIndex < 0) {
        sendJson(response, 404, { error: "No se encontró ese pago." });
        return;
      }
      const currentExpense = expenses[expenseIndex];
      const nextExpenses = expenses.map((expense, index) => index === expenseIndex
        ? { ...expense, payments: expense.payments.filter((payment) => payment.id !== paymentId) }
        : expense);
      await saveExpenses(nextExpenses);
      expenses = nextExpenses;
      response.writeHead(204);
      response.end();
      return;
    }
  }

  const expenseMatch = url.pathname.match(/^\/api\/expenses\/([^/]+)$/);
  if (expenseMatch) {
    const id = decodeURIComponent(expenseMatch[1]);
    const index = expenses.findIndex((expense) => expense.id === id);
    if (index < 0) {
      sendJson(response, 404, { error: "No se encontró ese concepto de gasto." });
      return;
    }

    if (request.method === "PUT") {
      const body = await readRequestBody(request);
      if (!validateExpense(body)) {
        sendJson(response, 400, { error: "Revisa los datos del concepto e inténtalo de nuevo." });
        return;
      }
      const updatedExpense = { ...body, id, payments: expenses[index].payments };
      const nextExpenses = expenses.map((expense, expenseIndex) => expenseIndex === index ? updatedExpense : expense);
      await saveExpenses(nextExpenses);
      expenses = nextExpenses;
      sendJson(response, 200, updatedExpense);
      return;
    }

    if (request.method === "DELETE") {
      const nextExpenses = expenses.filter((expense) => expense.id !== id);
      await saveExpenses(nextExpenses);
      expenses = nextExpenses;
      response.writeHead(204);
      response.end();
      return;
    }
  }

  const match = url.pathname.match(/^\/api\/guests\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const index = guests.findIndex((guest) => guest.id === id);
    if (index < 0) {
      sendJson(response, 404, { error: "No se encontró ese invitado." });
      return;
    }

    if (request.method === "PUT") {
      const body = await readRequestBody(request);
      if (!validateGuest(body)) {
        sendJson(response, 400, { error: "Revisa los datos del invitado e inténtalo de nuevo." });
        return;
      }
      const updatedGuest = { ...body, id };
      const nextGuests = guests.map((guest, guestIndex) => guestIndex === index ? updatedGuest : guest);
      await saveGuests(nextGuests);
      guests = nextGuests;
      sendJson(response, 200, updatedGuest);
      return;
    }

    if (request.method === "DELETE") {
      const nextGuests = guests.filter((guest) => guest.id !== id);
      await saveGuests(nextGuests);
      guests = nextGuests;
      response.writeHead(204);
      response.end();
      return;
    }
  }

  sendJson(response, 404, { error: "Ruta no encontrada." });
}

const vite = production
  ? null
  : await createViteServer({ configFile: path.join(root, "vite.config.ts"), server: { middlewareMode: true } });

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

let apiQueue = Promise.resolve();

async function runApiSerially(action) {
  let release;
  const turn = new Promise((resolve) => {
    release = resolve;
  });
  const previous = apiQueue;
  apiQueue = previous.then(() => turn);
  await previous;
  try {
    return await action();
  } finally {
    release();
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-frame-options", "DENY");
  response.setHeader("referrer-policy", "strict-origin-when-cross-origin");
  try {
    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/health" && request.method === "GET") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      const requestOrigin = request.headers.origin;
      if (request.method !== "GET" && requestOrigin) {
        const forwardedProtocol = String(request.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
        let origin;
        try {
          origin = new URL(requestOrigin);
        } catch {
          sendJson(response, 403, { error: "Origen de solicitud no permitido." });
          return;
        }
        if (origin.host !== request.headers.host || origin.protocol !== `${forwardedProtocol}:`) {
          sendJson(response, 403, { error: "Origen de solicitud no permitido." });
          return;
        }
      }

      if (url.pathname.startsWith("/api/auth/")) {
        await runApiSerially(() => handleAuthApi(request, response, url));
        return;
      }

      if (!hasValidSession(request)) {
        sendJson(response, 401, { error: "Inicia sesión para continuar." });
        return;
      }

      await runApiSerially(() => handleApi(request, response, url));
      return;
    }

    if (vite) {
      vite.middlewares(request, response, (error) => {
        if (error) {
          vite.ssrFixStacktrace(error);
          console.error(error);
          if (!response.headersSent) sendJson(response, 500, { error: "Error al servir la aplicación." });
        }
      });
      return;
    }

    const distDirectory = path.join(root, "dist");
    const requestedPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.resolve(distDirectory, `.${requestedPath}`);
    if (!filePath.startsWith(`${distDirectory}${path.sep}`)) {
      sendJson(response, 403, { error: "Ruta no permitida." });
      return;
    }
    try {
      const contents = await readFile(filePath);
      response.writeHead(200, {
        "content-type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      });
      response.end(contents);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (path.extname(requestedPath)) {
        sendJson(response, 404, { error: "Archivo no encontrado." });
        return;
      }
      const index = await readFile(path.join(distDirectory, "index.html"));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(index);
    }
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      const isInvalidJson = error instanceof SyntaxError;
      sendJson(response, isInvalidJson ? 400 : 500, {
        error: isInvalidJson ? "El JSON enviado no es válido." : "Ocurrió un error interno. Inténtalo de nuevo.",
      });
    } else {
      response.destroy(error);
    }
  }
});

server.listen(port, production ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(`Organizador de boda disponible en http://127.0.0.1:${port}`);
  console.log(database ? "Persistencia PostgreSQL activa." : `Datos locales guardados en ${dataFile}`);
});

if (vite) {
  server.on("close", () => vite.close());
}
server.on("close", () => database?.end());
