import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
const dataFile = path.join(dataDirectory, "guests.json");
const expensesFile = path.join(dataDirectory, "expenses.json");
const production = process.argv.includes("--production");
const port = Number(process.env.PORT) || (production ? 4173 : 5173);

await mkdir(dataDirectory, { recursive: true });

let guests;
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

let expenses;
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

async function saveGuests() {
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(guests, null, 2)}\n`, "utf8");
  await rename(temporaryFile, dataFile);
}

async function saveExpenses(nextExpenses = expenses) {
  const temporaryFile = `${expensesFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(nextExpenses, null, 2)}\n`, "utf8");
  await rename(temporaryFile, expensesFile);
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
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
    guests.push(guest);
    await saveGuests();
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
      guests[index] = { ...body, id };
      await saveGuests();
      sendJson(response, 200, guests[index]);
      return;
    }

    if (request.method === "DELETE") {
      guests.splice(index, 1);
      await saveGuests();
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

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
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
      sendJson(response, 400, { error: error instanceof SyntaxError ? "El JSON enviado no es válido." : error.message });
    } else {
      response.destroy(error);
    }
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Organizador de boda disponible en http://127.0.0.1:${port}`);
  console.log(`Datos de invitados guardados en ${dataFile}`);
});

if (vite) {
  server.on("close", () => vite.close());
}
