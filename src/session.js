import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  S_WHATSAPP_NET,
  encodeNewsletterMessage,
  generateMessageIDV2,
  generateWAMessageContent,
  getBinaryNodeChild,
  prepareWAMessageMedia,
  useMultiFileAuthState,
} from 'baileys';
import pino from 'pino';
import { DATA_DIR } from './config.js';
import { fetchImage, prepareImage } from './media.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'warn' });

// WhatsApp's query for "channels this account follows, administers or owns".
// Baileys has no helper for it; if WhatsApp retires the id, listChannels()
// falls back to the channels this gateway has already seen.
const SUBSCRIBED_QUERY_ID = '6388546374527196';
const CHANNELS_TTL_MS = 3 * 60 * 1000;

export class GatewayError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * One linked WhatsApp number: keeps its connection alive, exposes the QR code
 * while it is waiting to be linked, and sends posts to WhatsApp Channels.
 */
export class Session {
  constructor(name) {
    this.name = name;
    this.authDir = path.join(DATA_DIR, 'sessions', name);
    this.knownFile = path.join(DATA_DIR, `channels-${name}.json`);
    this.status = 'INIT'; // INIT | QR | AUTH
    this.qr = null;
    this.sock = null;
    this.stopped = false;
    this.startedAt = Math.floor(Date.now() / 1000);
    this.channelCache = null;
  }

  get phone() {
    return this.sock?.user?.id ? this.sock.user.id.split(/[:@]/)[0] : null;
  }

  async start() {
    this.stopped = false;

    const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

    const sock = makeWASocket({
      auth: state,
      logger,
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // Link cards are built from what the caller sends, never scraped here.
      generateHighQualityLinkPreview: false,
    });

    this.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        this.qr = qr;
        this.status = 'QR';
      }

      if (connection === 'open') {
        this.qr = null;
        this.status = 'AUTH';
        console.log(`[${this.name}] linked as +${this.phone}`);
      }

      if (connection === 'close') {
        this.status = 'INIT';
        this.qr = null;

        if (this.stopped) {
          return;
        }

        const code = lastDisconnect?.error?.output?.statusCode;

        // Logged out from the phone: the saved login is dead, start over with a new QR.
        if (code === DisconnectReason.loggedOut) {
          console.log(`[${this.name}] logged out from the phone, waiting for a new QR scan`);
          rmSync(this.authDir, { recursive: true, force: true });
        }

        setTimeout(() => this.start().catch((error) => console.error(`[${this.name}] restart failed`, error)), 3000);
      }
    });
  }

  /** Unlinks the number and wipes its saved login. */
  async logout() {
    this.stopped = true;

    try {
      await this.sock?.logout();
    } catch {
      this.sock?.end(undefined);
    }

    rmSync(this.authDir, { recursive: true, force: true });
    this.status = 'INIT';
    this.qr = null;
  }

  /** Closes the connection but keeps the saved login. */
  stop() {
    this.stopped = true;
    this.sock?.end(undefined);
  }

  requireAuth() {
    if (this.status !== 'AUTH' || !this.sock) {
      throw new GatewayError(409, 'WhatsApp number is not linked. Open the gateway page and scan the QR code.');
    }

    return this.sock;
  }

  // ---------------------------------------------------------------- channels

  readKnown() {
    try {
      return existsSync(this.knownFile) ? JSON.parse(readFileSync(this.knownFile, 'utf8')) : [];
    } catch {
      return [];
    }
  }

  remember(channel) {
    this.channelCache = null;
    const known = this.readKnown().filter((item) => item.id !== channel.id);
    known.push(channel);
    writeFileSync(this.knownFile, JSON.stringify(known, null, 2));
  }

  forget(id) {
    this.channelCache = null;
    writeFileSync(this.knownFile, JSON.stringify(this.readKnown().filter((item) => item.id !== id), null, 2));
  }

  toChannel(raw) {
    const thread = raw?.thread_metadata || {};

    return {
      id: raw.id,
      name: thread.name?.text || raw.name || '',
      type: 'newsletter',
      invite_code: thread.invite || raw.invite || '',
      description: thread.description?.text || raw.description || '',
      role: String(raw?.viewer_metadata?.role || raw.role || '').toLowerCase(),
    };
  }

  async querySubscribed() {
    const sock = this.requireAuth();

    const result = await sock.query({
      tag: 'iq',
      attrs: { id: sock.generateMessageTag(), type: 'get', to: S_WHATSAPP_NET, xmlns: 'w:mex' },
      content: [
        {
          tag: 'query',
          attrs: { query_id: SUBSCRIBED_QUERY_ID },
          content: Buffer.from(JSON.stringify({ variables: {} }), 'utf-8'),
        },
      ],
    });

    const child = getBinaryNodeChild(result, 'result');
    const data = JSON.parse(child.content.toString());

    if (data.errors?.length) {
      throw new Error(data.errors.map((error) => error.message).join(', '));
    }

    const list = data?.data?.xwa2_newsletter_subscribed;

    if (!Array.isArray(list)) {
      throw new Error('unexpected response');
    }

    return list.map((raw) => this.toChannel(raw));
  }

  /**
   * Channels the number is in, merged with every channel looked up before.
   * WhatsApp rate-limits this query, so the answer is reused for a few
   * minutes unless something changed or a refresh is asked for.
   */
  async listChannels({ fresh = false } = {}) {
    this.requireAuth();

    if (!fresh && this.channelCache && Date.now() - this.channelCache.at < CHANNELS_TTL_MS) {
      return this.channelCache.channels;
    }

    let live = [];
    let liveOk = false;

    try {
      live = await this.querySubscribed();
      liveOk = true;
      live.forEach((channel) => this.remember(channel));
    } catch (error) {
      logger.warn({ error: error.message }, 'subscribed channels query failed, using known channels');
    }

    const ids = new Set(live.map((channel) => channel.id));

    // Channels looked up by link but not in the account's own list: the number
    // has no role there, so it cannot post to them (yet).
    const others = this.readKnown()
      .filter((channel) => !ids.has(channel.id))
      .map((channel) => (liveOk ? { ...channel, role: '' } : channel));

    const channels = [...live, ...others];

    // A failed query (usually WhatsApp's rate limit) is only reused for a
    // minute, so it is retried soon without hammering WhatsApp meanwhile.
    this.channelCache = { at: liveOk ? Date.now() : Date.now() - CHANNELS_TTL_MS + 60_000, channels };

    return channels;
  }

  /** Looks a channel up by the code at the end of its whatsapp.com/channel/… link. */
  async findByInvite(code) {
    const sock = this.requireAuth();
    const raw = await sock.newsletterMetadata('invite', code);

    if (!raw?.id) {
      throw new GatewayError(404, 'channel not found');
    }

    const channel = this.toChannel(raw);
    this.remember(channel);

    return channel;
  }

  async createChannel(name, description) {
    const sock = this.requireAuth();

    // Baileys can fail to read WhatsApp's reply even though the channel was
    // created, so the result is always confirmed from the account's own list.
    try {
      await sock.newsletterCreate(String(name), description ? String(description) : undefined);
    } catch (error) {
      logger.warn({ error: error.message }, 'create channel reply could not be read, checking the channel list');
    }

    const channel = (await this.querySubscribed()).filter((item) => item.name === String(name)).pop();

    if (!channel) {
      throw new GatewayError(500, 'the channel could not be created');
    }

    this.remember(channel);

    return channel;
  }

  async deleteChannel(id) {
    const sock = this.requireAuth();
    this.assertChannel(id);
    await sock.newsletterDelete(id);
    this.channelCache = null;
    writeFileSync(this.knownFile, JSON.stringify(this.readKnown().filter((item) => item.id !== id), null, 2));

    return { success: true };
  }

  // ------------------------------------------------------------------- posts

  assertChannel(to) {
    if (!/^\d{10,20}@newsletter$/.test(String(to || ''))) {
      throw new GatewayError(400, 'wrong request parameters: "to" must look like 120363171744447809@newsletter');
    }
  }

  /**
   * Resolves once WhatsApp acknowledges the post. sendMessage() alone only
   * means "written to the socket": a post the server rejects would otherwise
   * be reported as sent.
   */
  awaitAck(sock, id) {
    return new Promise((resolve, reject) => {
      const event = `CB:ack,id:${id}`;

      const finish = (callback) => {
        clearTimeout(timer);
        sock.ws.off(event, onAck);
        callback();
      };

      const onAck = (node) => {
        const error = node?.attrs?.error;

        finish(() =>
          error ? reject(new GatewayError(502, `WhatsApp rejected the post (error ${error})`)) : resolve(true)
        );
      };

      // No answer either way: the post may still have gone out, so it is not
      // failed (a retry could then publish it twice) — only left unconfirmed.
      const timer = setTimeout(() => finish(() => resolve(false)), 15_000);

      sock.ws.on(event, onAck);
    });
  }

  result(to, id, confirmed) {
    return { sent: true, confirmed, message: { id, chat_id: to, from_me: true } };
  }

  async send(to, content) {
    const sock = this.requireAuth();
    this.assertChannel(to);

    const id = generateMessageIDV2(sock.user?.id);
    const ack = this.awaitAck(sock, id);
    ack.catch(() => {});

    await sock.sendMessage(to, content, { messageId: id });

    return this.result(to, id, await ack);
  }

  sendText(to, body) {
    return this.send(to, { text: String(body), linkPreview: null });
  }

  /**
   * Photo with caption. Sent as a hand-built stanza: channel media must carry
   * a "mediatype" attribute that Baileys' own sendMessage() leaves out, and
   * WhatsApp rejects the post without it.
   */
  async sendImage(to, mediaUrl, caption) {
    const sock = this.requireAuth();
    this.assertChannel(to);

    const { jpeg, thumbnail, width, height } = await prepareImage(await fetchImage(mediaUrl));

    const message = await generateWAMessageContent(
      {
        image: jpeg,
        caption: caption ? String(caption) : undefined,
        mimetype: 'image/jpeg',
        jpegThumbnail: thumbnail.toString('base64'),
        width,
        height,
      },
      { upload: sock.waUploadToServer, jid: to, logger }
    );

    const id = generateMessageIDV2(sock.user?.id);
    const ack = this.awaitAck(sock, id);
    ack.catch(() => {});

    await sock.sendNode({
      tag: 'message',
      attrs: { to, id, type: 'media' },
      content: [{ tag: 'plaintext', attrs: { mediatype: 'image' }, content: encodeNewsletterMessage(message) }],
    });

    return this.result(to, id, await ack);
  }

  /**
   * Text whose link renders as a card. The card image is optional: a link
   * post must still go out when its picture can't be fetched or uploaded.
   */
  async sendLinkPreview(to, { body, title, description, canonical, media }) {
    const sock = this.requireAuth();
    this.assertChannel(to);

    const text = String(body);
    const linkPreview = {
      'canonical-url': canonical,
      'matched-text': canonical,
      title: title || canonical,
      description: description || undefined,
    };

    if (!text.includes(canonical)) {
      throw new GatewayError(400, 'wrong request parameters: "body" must contain the "canonical" link');
    }

    if (media) {
      try {
        const { jpeg, thumbnail, width, height } = await prepareImage(await fetchImage(media));
        linkPreview.jpegThumbnail = thumbnail;

        // The large card image is uploaded like a photo and referenced from the card.
        try {
          const { imageMessage } = await prepareWAMessageMedia(
            { image: jpeg },
            { upload: sock.waUploadToServer, mediaTypeOverride: 'thumbnail-link', jid: to, logger }
          );
          linkPreview.highQualityThumbnail = { ...imageMessage, width, height };
        } catch (error) {
          logger.warn({ error: error.message }, 'large link card image skipped');
        }
      } catch (error) {
        logger.warn({ error: error.message }, 'link card image skipped');
      }
    }

    return this.send(to, { text, linkPreview });
  }
}
