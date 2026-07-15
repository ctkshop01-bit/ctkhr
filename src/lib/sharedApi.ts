import type { AppDb } from "../types/domain.js";

async function readJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

type SharedCommandResponse<T> =
  | {
      ok: true;
      db: AppDb;
      result: T;
    }
  | {
      ok: false;
      code?: string;
      message?: string;
    };

export const shared = {
  bootstrap: () =>
    fetch("/api/bootstrap", {
      cache: "no-store",
    }).then(readJson<{ initialized: boolean }>),
};

export async function importLocalDbToServer(db: unknown) {
  const res = await fetch("/api/bootstrap/import-local", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ db }),
  });
  return readJson<{ ok: boolean }>(res);
}

export async function sharedApiLogin(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return readJson<{ ok: boolean; user?: { id: string; role: "admin" | "employee"; name: string } }>(res);
}

export async function loadSharedSnapshot() {
  const res = await fetch("/api/db/snapshot", {
    cache: "no-store",
  });
  return readJson<{ ok: true; db: AppDb } | { ok: false; message?: string }>(res);
}

export async function runSharedCommand<T = unknown>(command: unknown) {
  const res = await fetch("/api/db/command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(command),
  });
  return readJson<SharedCommandResponse<T>>(res);
}
