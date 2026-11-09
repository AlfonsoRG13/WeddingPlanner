import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
const dataFile = path.join(dataDirectory, "guests.json");
const production = process.argv.includes("--production");
const port = Number(process.env.PORT) || (production ? 4173 : 5173);

await mkdir(dataDirectory, { recursive: true });

let guests;
try {
  guests = JSON.parse(await readFile(dataFile, "utf8"));
  if (!Array.isArray(guests)) {
    throw new Error("El archivo de invitados debe contener una lista JSON.");
  }
} catch (error) {
  if (error.code === "ENOENT") {
    guests = [];
    await writeFile(dataFile, "[]\n", "utf8");
  } else {
    throw new Error(`No se pudo leer ${dataFile}: ${error.message}`, { cause: error });
  }
}

async function saveGuests() {
  const temporaryFile = `${dataFile}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(guests, null, 2)}\n`, "utf8");
  await rename(temporaryFile, dataFile);
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
  return value !== null
    && typeof value === "object"
    && typeof value.firstName === "string"
    && value.firstName.trim().length > 0
    && typeof value.lastName === "string"
    && value.lastName.trim().length > 0
    && typeof value.invitedBy === "string"
    && typeof value.hasPlusOne === "boolean"
    && typeof value.plusOneName === "string"
    && typeof value.confirmed === "boolean"
    && genders.includes(value.gender);
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
