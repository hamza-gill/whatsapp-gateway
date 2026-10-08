import { randomBytes } from 'node:crypto';
import express from 'express';
import QRCode from 'qrcode';
import {
  addSession,
  checkAdminPassword,
  config,
  regenerateToken,
  removeSession,
  setAdminPassword,
} from './config.js';
import {
  apiPage,
  channelsPage,
  dashboardPage,
  loginPage,
  notFoundPage,
  phonePage,
  phonesPage,
  settingsPage,
} from './views.js';

const COOKIE = 'gw_session';
const LOGIN_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const LOCK_MS = 10 * 60 * 1000;

const canPost = (channel) => ['owner', 'admin'].includes(channel.role);

// Deleting needs this word typed in capitals; the page asks for it and the
// server refuses the request without it.
const DELETE_WORD = 'DELETE';
const NOT_CONFIRMED = `Nothing was deleted: type ${DELETE_WORD} in capital letters to confirm.`;

/**
 * The browser admin panel: sign in, link phones by QR code, manage their
 * WhatsApp Channels and read the API tokens. Logins are kept in memory, so a
 * gateway restart signs everyone out.
 */
export function adminRouter({ sessions, startSession }) {
  const router = express.Router();
  const logins = new Map(); // session id -> { csrf, expires, flash }
  const attempts = new Map(); // ip -> { count, until }

  const readCookie = (req) =>
    (req.get('cookie') || '')
      .split(';')
      .map((part) => part.trim().split('='))
      .find(([name]) => name === COOKIE)?.[1];

  const currentLogin = (req) => {
    const login = logins.get(readCookie(req));

    if (!login || login.expires < Date.now()) {
      return null;
    }

    return login;
  };

  const setCookie = (req, res, value, maxAgeSeconds) =>
    res.append(
      'Set-Cookie',
      `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${req.secure ? '; Secure' : ''}`
    );

  const signedIn = (req, res, next) => {
    req.login = currentLogin(req);

    if (!req.login) {
      return req.path === '/panel/state' ? res.status(401).json({ error: 'signed out' }) : res.redirect('/login');
    }

    // Every change must carry the token rendered into the page it came from.
    if (req.method !== 'GET' && req.body?._csrf !== req.login.csrf) {
      return res.status(403).send('Invalid form token. Reload the page and try again.');
    }

    res.set('Cache-Control', 'no-store');
    next();
  };

  // A one-time message shown on the next page, kept out of the URL.
  const flash = (req, res, type, text, to) => {
    req.login.flash = { type, text };
    res.redirect(to);
  };

  const phoneUrl = (name) => `/phones/${encodeURIComponent(name)}`;

  // ------------------------------------------------------------- sign in

  router.get('/login', (req, res) => {
    if (currentLogin(req)) {
      return res.redirect('/');
    }

    res.set('Cache-Control', 'no-store').send(loginPage({}));
  });

  router.post('/login', (req, res) => {
    const attempt = attempts.get(req.ip) || { count: 0, until: 0 };

    if (attempt.until > Date.now()) {
      return res.status(429).send(loginPage({ error: 'Too many wrong attempts. Try again in 10 minutes.' }));
    }

    if (req.body?.username !== 'admin' || !checkAdminPassword(req.body?.password)) {
      attempt.count += 1;

      if (attempt.count >= MAX_ATTEMPTS) {
        attempt.count = 0;
        attempt.until = Date.now() + LOCK_MS;
      }

      attempts.set(req.ip, attempt);

      return res.status(401).send(loginPage({ error: 'Wrong username or password.' }));
    }

    attempts.delete(req.ip);

    const id = randomBytes(32).toString('base64url');
    logins.set(id, { csrf: randomBytes(24).toString('base64url'), expires: Date.now() + LOGIN_TTL_MS, flash: null });
    setCookie(req, res, id, LOGIN_TTL_MS / 1000);
    res.redirect('/');
  });

  router.post('/logout', signedIn, (req, res) => {
    logins.delete(readCookie(req));
    setCookie(req, res, '', 0);
    res.redirect('/login');
  });

  // ------------------------------------------------------------ page data

  const channelsOf = async (name, fresh = false) => {
    const session = sessions.get(name);

    if (!session || session.status !== 'AUTH') {
      return [];
    }

    try {
      return await session.listChannels({ fresh });
    } catch {
      return [];
    }
  };

  const phoneData = async ({ name, token }, { withQr = false, fresh = false } = {}) => {
    const session = sessions.get(name);
    const channels = await channelsOf(name, fresh);

    return {
      name,
      token,
      status: session?.status || 'INIT',
      phone: session?.phone || null,
      qr: withQr && session?.qr ? await QRCode.toDataURL(session.qr, { width: 280, margin: 1 }) : null,
      channels,
      postable: channels.filter(canPost).length,
    };
  };

  const allPhones = (options) => Promise.all(config.sessions.map((entry) => phoneData(entry, options)));

  // Everything every page needs: form token, one-time message, sidebar state.
  const shell = (req, active) => {
    const message = req.login.flash;
    req.login.flash = null;

    return {
      csrf: req.login.csrf,
      active,
      flash: message,
      baseUrl: `${req.protocol}://${req.get('host')}`,
      usingInitialPassword: !config.adminPasswordHash,
    };
  };

  // ---------------------------------------------------------------- pages

  router.get('/', signedIn, async (req, res) => {
    res.send(dashboardPage({ ...shell(req, 'dashboard'), phones: await allPhones() }));
  });

  router.get('/phones', signedIn, async (req, res) => {
    res.send(phonesPage({ ...shell(req, 'phones'), phones: await allPhones() }));
  });

  router.get('/phones/:name', signedIn, async (req, res) => {
    const entry = config.sessions.find((item) => item.name === req.params.name);

    if (!entry) {
      return res.status(404).send(notFoundPage(shell(req, 'phones')));
    }

    res.send(phonePage({ ...shell(req, 'phones'), phone: await phoneData(entry, { withQr: true }) }));
  });

  router.get('/channels', signedIn, async (req, res) => {
    res.send(channelsPage({ ...shell(req, 'channels'), phones: await allPhones() }));
  });

  router.get('/api-reference', signedIn, async (req, res) => {
    res.send(apiPage({ ...shell(req, 'api'), phones: await allPhones() }));
  });

  router.get('/settings', signedIn, (req, res) => {
    res.send(settingsPage(shell(req, 'settings')));
  });

  // Polled by the phone pages so a scanned QR code updates the page by itself.
  router.get('/panel/state', signedIn, async (req, res) => {
    res.json(
      await Promise.all(
        config.sessions.map(async ({ name }) => {
          const session = sessions.get(name);

          return {
            name,
            status: session?.status || 'INIT',
            qr: session?.qr ? await QRCode.toDataURL(session.qr, { width: 280, margin: 1 }) : null,
          };
        })
      )
    );
  });

  // --------------------------------------------------------------- phones

  router.post('/phones', signedIn, (req, res) => {
    const added = addSession(req.body?.name);

    if (!added) {
      return flash(req, res, 'error', 'Use a new name made of letters, numbers, "-" or "_".', '/phones');
    }

    startSession(added.name);
    flash(req, res, 'ok', `Phone "${added.name}" added. Scan the QR code below to link it.`, phoneUrl(added.name));
  });

  router.post('/phones/:name/token', signedIn, (req, res) => {
    const updated = regenerateToken(req.params.name);

    if (!updated) {
      return flash(req, res, 'error', 'Phone not found.', '/phones');
    }

    flash(req, res, 'ok', 'New API token created. Update it wherever the old one was used.', phoneUrl(updated.name));
  });

  router.post('/phones/:name/unlink', signedIn, async (req, res) => {
    const session = sessions.get(req.params.name);

    if (!session) {
      return flash(req, res, 'error', 'Phone not found.', '/phones');
    }

    await session.logout();
    session.start().catch((error) => console.error(`[${session.name}] failed to start`, error));
    flash(req, res, 'ok', 'The phone was unlinked. Scan the new QR code to link a phone again.', phoneUrl(session.name));
  });

  router.post('/phones/:name/delete', signedIn, async (req, res) => {
    const session = sessions.get(req.params.name);

    if (!session) {
      return flash(req, res, 'error', 'Phone not found.', '/phones');
    }

    if (req.body?.confirm_word !== DELETE_WORD) {
      return flash(req, res, 'error', NOT_CONFIRMED, phoneUrl(session.name));
    }

    if (config.sessions.length === 1) {
      return flash(req, res, 'error', 'The last phone cannot be deleted. Unlink it instead.', phoneUrl(session.name));
    }

    await session.logout();
    sessions.delete(req.params.name);
    removeSession(req.params.name);
    flash(req, res, 'ok', `Phone "${req.params.name}" was deleted.`, '/phones');
  });

  // ------------------------------------------------------------- channels

  // Resolves the linked phone for a channel action, or answers with the error.
  const linkedPhone = (req, res) => {
    const session = sessions.get(req.params.name);

    if (!session) {
      flash(req, res, 'error', 'Phone not found.', '/phones');

      return null;
    }

    if (session.status !== 'AUTH') {
      flash(req, res, 'error', 'Link this phone first by scanning its QR code.', phoneUrl(session.name));

      return null;
    }

    return session;
  };

  router.post('/phones/:name/channels/create', signedIn, async (req, res) => {
    const session = linkedPhone(req, res);

    if (!session) {
      return;
    }

    const name = String(req.body?.channel_name || '').trim();

    if (name.length < 2 || name.length > 100) {
      return flash(req, res, 'error', 'Give the new channel a name (2 to 100 characters).', phoneUrl(session.name));
    }

    try {
      const created = await session.createChannel(name, String(req.body?.description || '').trim() || undefined);
      flash(req, res, 'ok', `Channel "${created.name}" was created. Its channel ID is listed below.`, phoneUrl(session.name));
    } catch (error) {
      flash(req, res, 'error', `The channel could not be created: ${error.message}`, phoneUrl(session.name));
    }
  });

  // Looks a channel up from its whatsapp.com/channel/… link and says whether
  // this phone is allowed to post there.
  router.post('/phones/:name/channels/lookup', signedIn, async (req, res) => {
    const session = linkedPhone(req, res);

    if (!session) {
      return;
    }

    const back = phoneUrl(session.name);
    const code = String(req.body?.link || '').trim().split(/[?#]/)[0].split('/').filter(Boolean).pop() || '';

    if (!/^[A-Za-z0-9]{10,40}$/.test(code)) {
      return flash(req, res, 'error', 'Paste the channel link, e.g. https://whatsapp.com/channel/0029Vb5…', back);
    }

    try {
      const found = await session.findByInvite(code);
      const mine = (await session.listChannels({ fresh: true })).find((channel) => channel.id === found.id);

      if (mine && canPost(mine)) {
        return flash(req, res, 'ok', `"${found.name}" is ready: this phone is ${mine.role} of it.`, back);
      }

      flash(
        req,
        res,
        'error',
        `"${found.name}" was found, but +${session.phone} is not an admin of it, so it cannot post there. On the phone that owns the channel: open the channel → channel info → Invite admins → add +${session.phone}, accept the invite, then reload this page.`,
        back
      );
    } catch {
      flash(req, res, 'error', 'No WhatsApp Channel was found for that link.', back);
    }
  });

  router.post('/phones/:name/channels/test', signedIn, async (req, res) => {
    const session = linkedPhone(req, res);

    if (!session) {
      return;
    }

    const text = String(req.body?.text || '').trim();

    if (text === '') {
      return flash(req, res, 'error', 'Write the text of the test post.', phoneUrl(session.name));
    }

    try {
      const result = await session.sendText(String(req.body?.id || ''), text);
      flash(
        req,
        res,
        'ok',
        result.confirmed ? 'Test post published in the channel.' : 'Test post sent, but WhatsApp did not confirm it. Check the channel.',
        phoneUrl(session.name)
      );
    } catch (error) {
      flash(req, res, 'error', `The test post failed: ${error.message}`, phoneUrl(session.name));
    }
  });

  router.post('/phones/:name/channels/delete', signedIn, async (req, res) => {
    const session = linkedPhone(req, res);

    if (!session) {
      return;
    }

    if (req.body?.confirm_word !== DELETE_WORD) {
      return flash(req, res, 'error', NOT_CONFIRMED, phoneUrl(session.name));
    }

    try {
      await session.deleteChannel(String(req.body?.id || ''));
      flash(req, res, 'ok', 'The channel was deleted from WhatsApp.', phoneUrl(session.name));
    } catch (error) {
      flash(req, res, 'error', `The channel could not be deleted: ${error.message}`, phoneUrl(session.name));
    }
  });

  // Asks WhatsApp again instead of using the list remembered for a few minutes.
  router.post('/phones/:name/channels/refresh', signedIn, async (req, res) => {
    const session = linkedPhone(req, res);

    if (!session) {
      return;
    }

    await channelsOf(session.name, true);
    flash(req, res, 'ok', 'Channel list refreshed from WhatsApp.', phoneUrl(session.name));
  });

  router.post('/phones/:name/channels/forget', signedIn, (req, res) => {
    sessions.get(req.params.name)?.forget(String(req.body?.id || ''));
    flash(req, res, 'ok', 'Channel removed from this list.', phoneUrl(req.params.name));
  });

  // -------------------------------------------------------------- account

  router.post('/settings/password', signedIn, (req, res) => {
    const { current, password, confirm } = req.body || {};

    if (!checkAdminPassword(current)) {
      return flash(req, res, 'error', 'The current password is wrong.', '/settings');
    }

    if (typeof password !== 'string' || password.length < 10) {
      return flash(req, res, 'error', 'The new password must be at least 10 characters.', '/settings');
    }

    if (password !== confirm) {
      return flash(req, res, 'error', 'The two new passwords do not match.', '/settings');
    }

    setAdminPassword(password);

    // Every other browser is signed out; this one stays in.
    const keep = readCookie(req);
    [...logins.keys()].filter((id) => id !== keep).forEach((id) => logins.delete(id));

    flash(req, res, 'ok', 'Password changed.', '/settings');
  });

  return router;
}
