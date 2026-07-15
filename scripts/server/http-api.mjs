import { ensureSharedDbFile, saveSharedDb } from "./app-db-file.mjs";
import { applySharedCommand, loginWithSharedDb } from "./app-db-commands.mjs";

export async function handleApiRequest(req, res, { dataFilePath }) {
  if (req.url === "/api/bootstrap" && req.method === "GET") {
    const state = await ensureSharedDbFile(dataFilePath);
    sendJson(res, 200, { initialized: state.initialized });
    return true;
  }

  if (req.url === "/api/bootstrap/import-local" && req.method === "POST") {
    const body = await readJson(req);
    await saveSharedDb(dataFilePath, body.db);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (req.url === "/api/auth/login" && req.method === "POST") {
    const body = await readJson(req);
    const state = await ensureSharedDbFile(dataFilePath);
    if (!state.initialized || !state.db) {
      sendJson(res, 503, { ok: false, message: "Shared DB is not initialized" });
      return true;
    }

    const user = await loginWithSharedDb(state.db, body.username, body.password);
    sendJson(res, user ? 200 : 401, user ? { ok: true, user } : { ok: false });
    return true;
  }

  if (req.url === "/api/db/snapshot" && req.method === "GET") {
    const state = await ensureSharedDbFile(dataFilePath);
    if (!state.initialized || !state.db) {
      sendJson(res, 503, { ok: false, message: "Shared DB is not initialized" });
      return true;
    }

    sendJson(res, 200, { ok: true, db: state.db });
    return true;
  }

  if (req.url === "/api/db/command" && req.method === "POST") {
    const state = await ensureSharedDbFile(dataFilePath);
    if (!state.initialized || !state.db) {
      sendJson(res, 503, { ok: false, message: "Shared DB is not initialized" });
      return true;
    }

    const body = await readJson(req);

    try {
      const result = await applySharedCommand(state.db, body);
      if (result.ok && result.db) {
        await saveSharedDb(dataFilePath, result.db);
      }
      sendJson(res, 200, result);
    } catch (error) {
      sendJson(res, 400, {
        ok: false,
        message: error instanceof Error ? error.message : "Unsupported command",
      });
    }

    return true;
  }

  return false;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate",
    pragma: "no-cache",
    expires: "0",
  });
  res.end(JSON.stringify(payload));
}
