import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import { adminRouter } from './admin.js';
import { PORT, config, configWasCreated } from './config.js';
import { GatewayError, Session } from './session.js';

const sessions = new Map();

function startSession(name) {
  const session = new Session(name);
  sessions.set(name, session);
  session.start().catch((error) => console.error(`[${name}] failed to start`, error));

  return session;
}

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  return left.length === right.length && timingSafeEqual(left, right);
};

const app = express();
app.disable('x-powered-by');
// Behind a local HTTPS reverse proxy, so the dashboard sees https and the real client address.
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Errors use the same shape as Whapi.Cloud so the admin portal reads them unchanged.
const fail = (res, status, message, details) =>
  res.status(status).json({ error: { code: status, message, ...(details ? { details } : {}) } });

// ------------------------------------------------------------------ API
// Authorization: Bearer <token> — the token selects the linked number.

function api(handler) {
  return async (req, res) => {
    const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const entry = token ? config.sessions.find((item) => safeEqual(item.token, token)) : null;
    const session = entry ? sessions.get(entry.name) : null;

    if (!session) {
      return fail(res, 401, 'unauthorized', 'missing or unknown API token');
    }

    try {
      res.json(await handler(session, req));
    } catch (error) {
      if (error instanceof GatewayError) {
        return fail(res, error.status, error.message);
      }

      console.error(`[${session.name}] ${req.method} ${req.path} failed:`, error?.message || error);
      fail(res, 500, 'request failed', String(error?.message || error));
    }
  };
}

const required = (body, fields) => {
  for (const field of fields) {
    if (typeof body?.[field] !== 'string' || body[field].trim() === '') {
      throw new GatewayError(400, `wrong request parameters: "${field}" is required`);
    }
  }
};

app.get(
  '/health',
  api((session) => ({
    start_at: session.startedAt,
    uptime: Math.floor(Date.now() / 1000) - session.startedAt,
    status: { code: session.status === 'AUTH' ? 4 : session.status === 'QR' ? 2 : 1, text: session.status },
    user: session.phone ? { id: session.phone } : null,
    channel_id: session.name,
  }))
);

app.get(
  '/newsletters',
  api(async (session) => {
    const newsletters = await session.listChannels();

    return { newsletters, count: newsletters.length, total: newsletters.length };
  })
);

app.get(
  '/newsletters/invite/:code',
  api((session, req) => session.findByInvite(req.params.code))
);

app.post(
  '/newsletters',
  api((session, req) => {
    required(req.body, ['name']);

    return session.createChannel(req.body.name, req.body.description);
  })
);

app.delete(
  '/newsletters/:id',
  api((session, req) => session.deleteChannel(req.params.id))
);

app.post(
  '/messages/text',
  api((session, req) => {
    required(req.body, ['to', 'body']);

    return session.sendText(req.body.to, req.body.body);
  })
);

app.post(
  '/messages/image',
  api((session, req) => {
    required(req.body, ['to', 'media']);

    return session.sendImage(req.body.to, req.body.media, req.body.caption);
  })
);

app.post(
  '/messages/link_preview',
  api((session, req) => {
    required(req.body, ['to', 'body', 'canonical']);

    return session.sendLinkPreview(req.body.to, req.body);
  })
);

// The browser dashboard (sign in, QR codes, tokens, channel IDs).
app.use(adminRouter({ sessions, startSession }));

app.use((req, res) => fail(res, 404, 'not found', `${req.path} not found`));

// ---------------------------------------------------------------- start

config.sessions.forEach(({ name }) => startSession(name));

app.listen(PORT, () => {
  console.log(`WhatsApp gateway listening on http://localhost:${PORT}`);
  console.log('Dashboard: sign in as "admin".');

  if (configWasCreated) {
    console.log(`First start: the dashboard password is ${config.adminPassword} (also in data/config.json). Change it after signing in.`);
  }
});

// A dropped WhatsApp socket must never take the whole gateway down.
process.on('unhandledRejection', (error) => console.error('unhandled rejection:', error?.message || error));

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    sessions.forEach((session) => session.stop());
    process.exit(0);
  });
}
