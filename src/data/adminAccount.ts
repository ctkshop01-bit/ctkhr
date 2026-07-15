import type { AppDb, User } from "../types/domain.js";
import { sha256Hex } from "../utils/core.js";

export type UpdateAdminAccountInput = {
  currentPassword: string;
  newUsername: string;
  newPassword: string;
};

export type UpdateAdminAccountResult =
  | { ok: true; db: AppDb }
  | {
      ok: false;
      code: "bad_current_password" | "username_taken" | "admin_not_found" | "invalid_input";
    };

async function verifyPassword(stored: string, input: string) {
  if (stored.length === 64 && /^[a-f0-9]+$/i.test(stored)) {
    return (await sha256Hex(input)) === stored;
  }

  return stored === input;
}

async function hashPassword(input: string) {
  return sha256Hex(input);
}

function findSingleAdmin(users: User[]) {
  const admins = users.filter(user => user.role === "admin");
  return admins.length === 1 ? admins[0] : null;
}

export function createAdminAccountUpdater(db: AppDb) {
  return {
    update: async (input: UpdateAdminAccountInput): Promise<UpdateAdminAccountResult> => {
      const newUsername = input.newUsername.trim();
      if (!newUsername || !input.newPassword) {
        return { ok: false, code: "invalid_input" };
      }

      const admin = findSingleAdmin(db.users);
      if (!admin) {
        return { ok: false, code: "admin_not_found" };
      }

      const passwordMatches = await verifyPassword(admin.passwordHash, input.currentPassword);
      if (!passwordMatches) {
        return { ok: false, code: "bad_current_password" };
      }

      const usernameTaken = db.users.some(user => user.id !== admin.id && user.username === newUsername);
      if (usernameTaken) {
        return { ok: false, code: "username_taken" };
      }

      const updatedAdmin: User = {
        ...admin,
        username: newUsername,
        passwordHash: await hashPassword(input.newPassword),
      };

      return {
        ok: true,
        db: {
          ...db,
          users: db.users.map(user => (user.id === admin.id ? updatedAdmin : user)),
        },
      };
    },
  };
}
