import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DATA_DIR = process.env.GATEWAY_DATA_DIR || path.join(ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const randomToken = () => randomBytes(24).toString('base64url');

/**
 * data/config.json holds everything that must survive a restart: the admin
 * password and one entry per linked WhatsApp number (its name and API token).
 * It is created with random secrets on first start.
 */
function load() {
  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(CONFIG_FILE)) {
    const fresh = {
      port: 3400,
      adminPassword: randomToken(),
      sessions: [{ name: 'default', token: randomToken() }],
    };
    writeFileSync(CONFIG_FILE, JSON.stringify(fresh, null, 2));
    return { config: fresh, created: true };
  }

  return { config: JSON.parse(readFileSync(CONFIG_FILE, 'utf8')), created: false };
}

const loaded = load();

export const config = loaded.config;
export const configWasCreated = loaded.created;
export const PORT = Number(process.env.PORT || config.port || 3400);

export function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function addSession(name) {
  const clean = String(name || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

  if (clean === '' || config.sessions.some((session) => session.name === clean)) {
    return null;
  }

  const session = { name: clean, token: randomToken() };
  config.sessions.push(session);
  saveConfig();

  return session;
}

/** Replaces a number's API token; the old one stops working immediately. */
export function regenerateToken(name) {
  const session = config.sessions.find((item) => item.name === name);

  if (session) {
    session.token = randomToken();
    saveConfig();
  }

  return session || null;
}

// The first password is generated in plain text so it can be read from the
// file; once changed from the dashboard only its scrypt hash is kept.
export function checkAdminPassword(password) {
  const given = String(password || '');

  if (config.adminPasswordHash) {
    const [salt, hash] = config.adminPasswordHash.split(':');
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(given, Buffer.from(salt, 'hex'), expected.length);

    return timingSafeEqual(actual, expected);
  }

  const expected = Buffer.from(String(config.adminPassword || ''));
  const actual = Buffer.from(given);

  return expected.length > 0 && actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function setAdminPassword(password) {
  const salt = randomBytes(16);

  config.adminPasswordHash = `${salt.toString('hex')}:${scryptSync(String(password), salt, 64).toString('hex')}`;
  delete config.adminPassword;
  saveConfig();
}

export function removeSession(name) {
  config.sessions = config.sessions.filter((session) => session.name !== name);
  saveConfig();
}
