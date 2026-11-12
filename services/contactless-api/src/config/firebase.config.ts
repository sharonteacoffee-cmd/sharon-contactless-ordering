import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface RawServiceAccountJson {
  project_id?: unknown;
  projectId?: unknown;
  client_email?: unknown;
  clientEmail?: unknown;
  private_key?: unknown;
  privateKey?: unknown;
}

function normalizePrivateKey(rawKey: string | undefined): string {
  if (!rawKey) return '';
  return rawKey.trim().replace(/\\n/g, '\n');
}

function loadServiceAccountFromFile(
  serviceAccountPath: string,
): FirebaseAdminCredentials | null {
  const trimmed = serviceAccountPath.trim();
  if (!trimmed) return null;

  try {
    const resolved = path.resolve(trimmed);
    const rawText = fs.readFileSync(resolved, 'utf-8');
    const parsed = JSON.parse(rawText) as RawServiceAccountJson;
    const projectId =
      typeof parsed.project_id === 'string'
        ? parsed.project_id.trim()
        : typeof parsed.projectId === 'string'
          ? parsed.projectId.trim()
          : '';
    const clientEmail =
      typeof parsed.client_email === 'string'
        ? parsed.client_email.trim()
        : typeof parsed.clientEmail === 'string'
          ? parsed.clientEmail.trim()
          : '';
    const rawPrivateKey =
      typeof parsed.private_key === 'string'
        ? parsed.private_key
        : typeof parsed.privateKey === 'string'
          ? parsed.privateKey
          : '';
    const privateKey = normalizePrivateKey(rawPrivateKey);

    if (!projectId || !clientEmail || !privateKey) {
      console.warn(
        `[firebase] FIREBASE_SERVICE_ACCOUNT_PATH (${resolved}) is missing project_id, client_email, or private_key.`,
      );
      return null;
    }

    return { projectId, clientEmail, privateKey };
  } catch (err) {
    console.warn(
      `[firebase] Could not load FIREBASE_SERVICE_ACCOUNT_PATH: ${
        err instanceof Error ? err.message : 'Unknown error'
      }`,
    );
    return null;
  }
}

export function resolveFirebaseAdminCredentials(): FirebaseAdminCredentials | null {
  const envProjectId = process.env.FIREBASE_PROJECT_ID?.trim() ?? '';
  const envClientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? '';
  const envPrivateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (envProjectId && envClientEmail && envPrivateKey) {
    return {
      projectId: envProjectId,
      clientEmail: envClientEmail,
      privateKey: envPrivateKey,
    };
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ?? '';
  if (serviceAccountPath) {
    return loadServiceAccountFromFile(serviceAccountPath);
  }

  return null;
}

export const firebaseConfig = {
  get projectId(): string {
    return process.env.FIREBASE_PROJECT_ID?.trim() ?? '';
  },
  get clientEmail(): string {
    return process.env.FIREBASE_CLIENT_EMAIL?.trim() ?? '';
  },
  get privateKey(): string {
    return normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  },
  get serviceAccountPath(): string {
    return process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ?? '';
  },
};

export function isFirebaseAdminConfigured(): boolean {
  return resolveFirebaseAdminCredentials() !== null;
}
