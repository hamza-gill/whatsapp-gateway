# WhatsApp Gateway

Self-hosted replacement for Whapi.Cloud, used by the Wanderlust admin portal to
publish posts on WhatsApp Channels. It links a WhatsApp number as a "linked
device" (QR code) and exposes the same HTTP endpoints the admin portal already
calls, so switching is a URL and token change.

Meta has no official API for WhatsApp Channels. This gateway uses the
open-source [Baileys](https://github.com/WhiskeySockets/Baileys) library, which
is unofficial: WhatsApp can restrict a number used this way, and a WhatsApp
protocol change can break posting until Baileys is updated. Keep volume low.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

On first start it creates `data/config.json` with one API token and a random
dashboard password, which is printed in the console once.

Open `http://localhost:3400` and sign in as user `admin`. The dashboard shows:

- each WhatsApp number with its link status and QR code,
- its API token (show, copy, or replace with a new one),
- the WhatsApp Channels of that number with their channel IDs,
- the gateway URL and an API reference,
- a form to change the dashboard password (stored hashed once changed).

To link a number, scan its QR code from the phone:
WhatsApp → Settings → Linked devices → Link a device.

The number must be owner or admin of the WhatsApp Channel it posts to.

## Connect the admin portal

1. In the Laravel `.env`:
   ```
   WHATSAPP_CHANNELS_GATEWAY_URL=http://localhost:3400
   ```
   then `php artisan config:clear`.
2. Admin portal → WhatsApp Channels → Edit the channel → paste the API token
   shown on the dashboard into "Gateway API token" → save.
3. Click "Test gateway". The channel should be listed.

## Several WhatsApp numbers

Each number has its own token. Add one from the dashboard
("Add a WhatsApp number"), scan its QR code, and use its token for the
channels that number administers.

## API

All calls need `Authorization: Bearer <token>`. Errors are returned as
`{"error": {"code", "message", "details"}}`.

| Method | Path | Body |
|---|---|---|
| GET | `/health` | — |
| GET | `/newsletters` | — |
| GET | `/newsletters/invite/{code}` | — (code from the `whatsapp.com/channel/{code}` link) |
| POST | `/newsletters` | `name`, `description` (creates a channel owned by the number) |
| DELETE | `/newsletters/{id}` | — (deletes a channel the number owns) |
| POST | `/messages/text` | `to`, `body` |
| POST | `/messages/image` | `to`, `media` (image URL), `caption` |
| POST | `/messages/link_preview` | `to`, `body`, `canonical`, `title`, `description`, `media` (image URL) |

`to` is the channel ID, e.g. `120363171744447809@newsletter`. Successful sends
return `{"sent": true, "confirmed": true, "message": {"id": "..."}}`. `confirmed`
is false when WhatsApp did not acknowledge the post within 15 seconds; a post
WhatsApp rejects is returned as an error instead.

## Production

- Run it under a process manager so it restarts on crash and on reboot:
  ```bash
  npm install -g pm2
  pm2 start src/server.js --name whatsapp-gateway
  pm2 save && pm2 startup
  ```
- Put it behind HTTPS (nginx or Caddy reverse proxy to port 3400) on its own
  subdomain. If it runs on the same server as the admin portal, keep the port
  closed to the internet and use `http://127.0.0.1:3400` instead.
- Back up the `data/` folder. It holds the tokens and the WhatsApp logins; if
  it is lost, scan the QR codes again. Anyone who has it can post as your
  numbers, so never commit or share it.
- Open WhatsApp on the phone at least once every 14 days, or WhatsApp unlinks
  the device.
- Settings: `PORT`, `GATEWAY_DATA_DIR` and `LOG_LEVEL` environment variables.
