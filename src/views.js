const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const STYLE = `
:root{--green:#128c4b;--green-dark:#0c6b39;--ink:#111b21;--muted:#5d6b73;--line:#e3e8e6;--bg:#f2f5f4;--card:#fff;--red:#c62828;--amber:#9a6700;--side:#111b21}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);font-size:15px;line-height:1.5}
a{color:var(--green-dark)}
h1,h2,h3,p{margin:0}
h1,h2,h3{line-height:1.25}
.app{display:grid;grid-template-columns:240px minmax(0,1fr);min-height:100vh}
.side{background:var(--side);color:#cfd8dc;padding:20px 14px;display:flex;flex-direction:column;gap:22px;position:sticky;top:0;height:100vh}
.brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:16px;color:#fff;padding:0 8px}
.logo{width:32px;height:32px;border-radius:10px;background:#25d366;display:grid;place-items:center;flex:none}
.nav{display:grid;gap:4px}
.nav a{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;color:#cfd8dc;text-decoration:none;font-size:14px;font-weight:600}
.nav a:hover{background:rgba(255,255,255,.07);color:#fff}
.nav a[aria-current=page]{background:rgba(37,211,102,.16);color:#fff}
.nav svg{width:18px;height:18px;flex:none}
.side form{margin-top:auto}
.side .signout{width:100%;background:transparent;border-color:rgba(255,255,255,.25);color:#fff}
.side .signout:hover{background:rgba(255,255,255,.1)}
.content{padding:28px 28px 56px;min-width:0}
.page{max-width:1080px;margin:0 auto;display:grid;gap:20px}
.head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px}
.head h1{font-size:24px}
.head p,.sub{color:var(--muted);font-size:14px}
.crumb{font-size:13px;font-weight:600;text-decoration:none;display:inline-block;margin-bottom:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.card-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:16px 20px;border-bottom:1px solid var(--line)}
.card-head h2{font-size:16px}
.card-body{padding:20px}
.stats{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;display:flex;align-items:center;gap:14px}
.stat .icon{width:42px;height:42px;border-radius:12px;background:#e3f6ea;color:var(--green-dark);display:grid;place-items:center;flex:none}
.stat .icon svg{width:20px;height:20px}
.stat b{display:block;font-size:24px;line-height:1.1}
.stat span{color:var(--muted);font-size:13px}
.badge{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;white-space:nowrap}
.badge::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}
.badge.ok{background:#e3f6ea;color:var(--green-dark)} .badge.wait{background:#fff4d6;color:var(--amber)} .badge.off{background:#eceff1;color:var(--muted)}
.label{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:0 0 6px}
.field{display:flex;gap:8px;align-items:stretch}
.field input{flex:1;min-width:0}
input[type=text],input[type=password],textarea{width:100%;border:1px solid #cfd8d5;border-radius:9px;padding:10px 12px;font:inherit;background:#fff;color:var(--ink)}
input:focus-visible,textarea:focus-visible,button:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid #8fd8ae;outline-offset:1px}
input.mono,code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px}
pre{background:#f3f6f5;border:1px solid var(--line);border-radius:9px;padding:12px;overflow-x:auto;white-space:pre}
button,.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;font:inherit;font-size:14px;font-weight:600;border-radius:9px;padding:9px 14px;border:1px solid #cfd8d5;background:#fff;color:var(--ink);cursor:pointer;text-decoration:none;white-space:nowrap}
button:hover,.btn:hover{background:#f3f6f5}
.primary{background:var(--green);border-color:var(--green);color:#fff} .primary:hover{background:var(--green-dark)}
.danger{color:var(--red);border-color:#f0c4c4} .danger:hover{background:#fdf0f0}
.small{font-size:13px;padding:6px 10px}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.row form{margin:0}
.qr{display:flex;flex-wrap:wrap;gap:24px;align-items:center}
.qr img{border:1px solid var(--line);border-radius:12px;background:#fff;width:230px;height:230px}
.qr ol{margin:0;padding-left:20px;display:grid;gap:4px}
.table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:12px 20px;border-bottom:1px solid var(--line);vertical-align:middle}
th{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;background:#f8faf9;white-space:nowrap}
tr:last-child td{border-bottom:0}
td.right,th.right{text-align:right}
.name{font-weight:600;color:var(--ink);text-decoration:none} a.name:hover{text-decoration:underline}
.alert{border-radius:10px;padding:12px 14px;font-size:14px;border:1px solid}
.alert.ok{background:#e9f8ef;border-color:#b9e6c9;color:#0c5b31} .alert.error{background:#fdf0f0;border-color:#f0c4c4;color:#8e1c1c} .alert.warn{background:#fff8e1;border-color:#f1dc9a;color:#6b4a00}
.empty{color:var(--muted);font-size:14px;padding:28px 20px;text-align:center}
.stack{display:grid;gap:12px;max-width:440px}
.two{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))}
.inline{display:flex;flex-wrap:wrap;gap:8px}
.inline input{flex:1;min-width:180px}
dialog{border:1px solid var(--line);border-radius:14px;padding:22px;width:min(440px,calc(100vw - 32px));box-shadow:0 20px 60px rgba(17,27,33,.25);color:var(--ink);text-align:left}
dialog::backdrop{background:rgba(17,27,33,.45)}
dialog .stack{max-width:none}
label{display:block;font-size:13px;font-weight:600;margin-bottom:5px}
.steps{margin:0;padding-left:20px;display:grid;gap:8px}
.login{min-height:100vh;display:grid;place-items:center;padding:16px}
.login .card{width:100%;max-width:380px;padding:28px;overflow:visible}
.login h1{font-size:20px;margin:14px 0 4px}
.login .sub{margin-bottom:16px}
@media (max-width:820px){
  .app{grid-template-columns:1fr}
  .side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:10px;padding:12px}
  .nav{display:flex;flex-wrap:wrap;gap:4px;flex:1 1 100%;order:3}
  .nav a{padding:8px 10px}
  .side form{margin:0 0 0 auto}
  .side .signout{width:auto}
  .content{padding:18px 14px 40px}
  th,td{padding:10px 12px}
}
`;

const ICONS = {
  dashboard: '<path d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10"/>',
  phones: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  channels: '<path d="M11 5.9v13.3a1.8 1.8 0 01-3.4.6l-2.2-6.1M18 13a3 3 0 000-6M5.4 13.7A4 4 0 017 6h1.8c4.1 0 7.6-1.2 9.2-3v14c-1.6-1.8-5.1-3-9.2-3H7a4 4 0 01-1.6-.3z"/>',
  api: '<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 5l-2 14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-2.8 1.2V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-2.9-1.2l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00-1.2-2.8H3a2 2 0 110-4h.1a1.7 1.7 0 001.2-2.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 002.8-1.2V3a2 2 0 114 0v.1a1.7 1.7 0 002.9 1.2l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 001.2 2.8h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1.1z"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
};

const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const LOGO =
  '<span class="logo" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg></span>';

const SCRIPT = `
document.querySelectorAll('[data-copy]').forEach(function (button) {
  button.addEventListener('click', function () {
    var input = document.getElementById(button.dataset.copy);
    navigator.clipboard.writeText(input.value).then(function () {
      var label = button.textContent;
      button.textContent = 'Copied';
      setTimeout(function () { button.textContent = label; }, 1500);
    });
  });
});
document.querySelectorAll('[data-toggle]').forEach(function (button) {
  button.addEventListener('click', function () {
    var input = document.getElementById(button.dataset.toggle);
    var hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    button.textContent = hidden ? 'Hide' : 'Show';
  });
});
// Confirmations use SweetAlert2. Deleting also needs the word DELETE typed
// in capitals; the server checks the same word again.
document.querySelectorAll('form[data-confirm]').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    if (form.dataset.confirmed) { return; }
    event.preventDefault();

    var word = form.dataset.confirmWord || '';
    var go = function (typed) {
      if (word) {
        var field = document.createElement('input');
        field.type = 'hidden';
        field.name = 'confirm_word';
        field.value = typed;
        form.appendChild(field);
      }
      form.dataset.confirmed = '1';
      form.submit();
    };

    // Without the library (no internet): plain browser dialogs, same rule.
    if (typeof Swal === 'undefined') {
      if (!word) { if (confirm(form.dataset.confirm)) { go(''); } return; }
      var answer = prompt(form.dataset.confirm + ' Type ' + word + ' in capital letters to confirm.');
      if (answer === word) { go(answer); } else if (answer !== null) { alert('Not deleted: you must type ' + word + ' in capital letters.'); }
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: form.dataset.confirmTitle || 'Are you sure?',
      text: form.dataset.confirm,
      input: word ? 'text' : undefined,
      inputLabel: word ? 'Type ' + word + ' in capital letters to confirm' : undefined,
      inputPlaceholder: word,
      inputAttributes: { autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false' },
      showCancelButton: true,
      focusCancel: !word,
      confirmButtonText: form.dataset.confirmButton || 'Yes, continue',
      confirmButtonColor: word ? '#c62828' : '#128c4b',
      cancelButtonText: 'Cancel',
      preConfirm: function (value) {
        if (word && value !== word) {
          Swal.showValidationMessage('Type ' + word + ' exactly, in capital letters.');
          return false;
        }
        return value || true;
      }
    }).then(function (result) {
      if (result.isConfirmed) { go(word ? result.value : ''); }
    });
  });
});
var notice = document.querySelector('[data-flash]');
if (notice && typeof Swal !== 'undefined') {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: notice.dataset.flash === 'ok' ? 'success' : 'error',
    title: notice.textContent,
    showConfirmButton: false,
    showCloseButton: true,
    timer: notice.dataset.flash === 'ok' ? 5000 : undefined,
    timerProgressBar: true
  });
  if (notice.dataset.flash === 'ok') { notice.remove(); }
}
document.querySelectorAll('[data-dialog]').forEach(function (button) {
  button.addEventListener('click', function () { document.getElementById(button.dataset.dialog).showModal(); });
});
document.querySelectorAll('[data-close-dialog]').forEach(function (button) {
  button.addEventListener('click', function () { button.closest('dialog').close(); });
});
// While a phone is not linked: refresh its QR code, and reload once its status changes.
if (document.querySelector('[data-phone]:not([data-status="AUTH"])')) {
  setInterval(function () {
    fetch('/panel/state', { headers: { Accept: 'application/json' } })
      .then(function (response) { if (response.status === 401) { location.href = '/login'; } return response.json(); })
      .then(function (state) {
        state.forEach(function (item) {
          var node = document.querySelector('[data-phone="' + CSS.escape(item.name) + '"]');
          if (!node) { return; }
          var image = node.querySelector('[data-qr]');
          if (node.dataset.status !== item.status || (item.qr && node.hasAttribute('data-wants-qr') && !image)) { location.reload(); return; }
          if (image && item.qr && image.src !== item.qr) { image.src = item.qr; }
        });
      })
      .catch(function () {});
  }, 4000);
}
`;

const SWEETALERT = '<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>';

const document_ = (title, body, script = '') => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${STYLE}</style></head><body>${body}${script ? `${SWEETALERT}<script>${script}</script>` : ''}</body></html>`;

const csrfField = (csrf) => `<input type="hidden" name="_csrf" value="${esc(csrf)}">`;

/**
 * A one-button form. `confirm` asks before submitting; `confirmWord` also
 * makes the person type that word (used for deleting).
 */
const action = (url, csrf, label, { cls = '', confirm = '', confirmTitle = '', confirmWord = '', fields = {} } = {}) => `
  <form method="post" action="${esc(url)}"${confirm ? ` data-confirm="${esc(confirm)}" data-confirm-title="${esc(confirmTitle)}" data-confirm-button="${esc(label)}"` : ''}${confirmWord ? ` data-confirm-word="${esc(confirmWord)}"` : ''}>
    ${csrfField(csrf)}
    ${Object.entries(fields).map(([name, value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`).join('')}
    <button type="submit" class="${cls}">${esc(label)}</button>
  </form>`;

const copyField = (id, value, { secret = false, label }) => `
  <div class="field">
    <input class="mono" type="${secret ? 'password' : 'text'}" id="${esc(id)}" value="${esc(value)}" readonly aria-label="${esc(label)}">
    ${secret ? `<button type="button" data-toggle="${esc(id)}">Show</button>` : ''}
    <button type="button" data-copy="${esc(id)}">Copy</button>
  </div>`;

const NAV = [
  ['dashboard', '/', 'Dashboard'],
  ['phones', '/phones', 'Phones'],
  ['channels', '/channels', 'Channels'],
  ['api', '/api-reference', 'API reference'],
  ['settings', '/settings', 'Settings'],
];

function layout(ctx, { title, heading, intro = '', crumb = '', actions = '' }, body) {
  return document_(
    `${title} · WhatsApp Gateway`,
    `<div class="app">
      <aside class="side">
        <div class="brand">${LOGO}WhatsApp Gateway</div>
        <nav class="nav" aria-label="Main">
          ${NAV.map(([key, url, label]) => `<a href="${url}"${ctx.active === key ? ' aria-current="page"' : ''}>${icon(key)}${label}</a>`).join('')}
        </nav>
        <form method="post" action="/logout">${csrfField(ctx.csrf)}<button type="submit" class="signout">Sign out</button></form>
      </aside>
      <div class="content"><div class="page">
        <div class="head">
          <div>${crumb}<h1>${esc(heading)}</h1>${intro ? `<p>${intro}</p>` : ''}</div>
          ${actions ? `<div class="row">${actions}</div>` : ''}
        </div>
        ${ctx.flash ? `<p class="alert ${ctx.flash.type === 'ok' ? 'ok' : 'error'}" data-flash="${ctx.flash.type === 'ok' ? 'ok' : 'error'}" role="${ctx.flash.type === 'ok' ? 'status' : 'alert'}">${esc(ctx.flash.text)}</p>` : ''}
        ${ctx.usingInitialPassword && ctx.active !== 'settings' ? '<p class="alert warn">You are still using the automatically generated password. <a href="/settings">Set your own password</a>.</p>' : ''}
        ${body}
      </div></div>
    </div>`,
    SCRIPT
  );
}

const STATUS = {
  AUTH: ['ok', 'Linked'],
  QR: ['wait', 'Waiting for QR scan'],
  INIT: ['off', 'Starting'],
};

const statusBadge = (status) => {
  const [cls, text] = STATUS[status] || STATUS.INIT;

  return `<span class="badge ${cls}">${text}</span>`;
};

const canPost = (channel) => ['owner', 'admin'].includes(channel.role);

const accessBadge = (channel) =>
  canPost(channel)
    ? `<span class="badge ok">Can post · ${esc(channel.role)}</span>`
    : '<span class="badge off">Cannot post · not admin</span>';

const phoneUrl = (name) => `/phones/${encodeURIComponent(name)}`;

const phoneLabel = (phone) => (phone.phone ? `+${esc(phone.phone)}` : '<span class="sub">Not linked</span>');

const stat = (iconName, value, label) =>
  `<div class="stat"><span class="icon">${icon(iconName)}</span><div><b>${esc(value)}</b><span>${esc(label)}</span></div></div>`;

const phonesTable = (phones) => `
  <div class="table-wrap"><table>
    <thead><tr><th>Phone</th><th>WhatsApp number</th><th>Status</th><th>Channels it can post to</th><th class="right"></th></tr></thead>
    <tbody>${phones
      .map(
        (phone) => `<tr data-phone="${esc(phone.name)}" data-status="${esc(phone.status)}">
          <td><a class="name" href="${phoneUrl(phone.name)}">${esc(phone.name)}</a></td>
          <td>${phoneLabel(phone)}</td>
          <td>${statusBadge(phone.status)}</td>
          <td>${phone.status === 'AUTH' ? phone.postable : '—'}</td>
          <td class="right"><a class="btn small" href="${phoneUrl(phone.name)}">${phone.status === 'AUTH' ? 'Manage' : 'Link phone'}</a></td>
        </tr>`
      )
      .join('')}</tbody>
  </table></div>`;

// ------------------------------------------------------------------ pages

export function loginPage({ error }) {
  return document_(
    'Sign in · WhatsApp Gateway',
    `<div class="login"><form class="card" method="post" action="/login">
      ${LOGO}
      <h1>WhatsApp Gateway</h1>
      <p class="sub">Sign in to manage phones, channels and API tokens.</p>
      ${error ? `<p class="alert error" role="alert" style="margin-bottom:14px">${esc(error)}</p>` : ''}
      <div class="stack">
        <div><label for="username">Username</label><input type="text" id="username" name="username" value="admin" autocomplete="username" required></div>
        <div><label for="password">Password</label><input type="password" id="password" name="password" autocomplete="current-password" required autofocus></div>
        <button class="primary" type="submit">Sign in</button>
      </div>
    </form></div>`
  );
}

export function dashboardPage(ctx) {
  const { phones } = ctx;
  const linked = phones.filter((phone) => phone.status === 'AUTH').length;
  const postable = phones.reduce((total, phone) => total + phone.postable, 0);
  const noAccess = phones.reduce((total, phone) => total + phone.channels.length - phone.postable, 0);

  return layout(
    ctx,
    { title: 'Dashboard', heading: 'Dashboard', intro: 'Your WhatsApp phones and the channels they can post to.' },
    `<div class="stats">
      ${stat('phones', `${linked} / ${phones.length}`, 'Phones linked')}
      ${stat('channels', postable, 'Channels ready to post')}
      ${stat('check', noAccess, 'Channels without access')}
    </div>

    <section class="card">
      <div class="card-head"><h2>Phones</h2><a class="btn small" href="/phones">Manage phones</a></div>
      ${phonesTable(phones)}
    </section>

    <section class="card">
      <div class="card-head"><h2>Gateway URL</h2></div>
      <div class="card-body" style="display:grid;gap:14px">
        ${copyField('base-url', ctx.baseUrl, { label: 'Gateway URL' })}
        <ol class="steps">
          <li>Put the <b>gateway URL</b> in the admin portal’s <code>.env</code> as <code>WHATSAPP_CHANNELS_GATEWAY_URL</code>, then run <code>php artisan config:clear</code> and restart the queue worker.</li>
          <li>Open a phone under <a href="/phones">Phones</a> and copy its <b>API token</b> into WhatsApp Channels → Edit → “Gateway API token”.</li>
          <li>Copy the <b>channel ID</b> from that phone’s channel list into “Gateway channel ID”, or paste the channel link and leave the ID empty.</li>
        </ol>
      </div>
    </section>`
  );
}

export function phonesPage(ctx) {
  return layout(
    ctx,
    { title: 'Phones', heading: 'Phones', intro: 'Each phone is one WhatsApp number linked by QR code, with its own API token.' },
    `<section class="card">
      <div class="card-head"><h2>Linked phones</h2></div>
      ${phonesTable(ctx.phones)}
    </section>

    <section class="card">
      <div class="card-head"><h2>Add a phone</h2></div>
      <div class="card-body">
        <p class="sub" style="margin-bottom:12px">Add one when a channel is owned by a different WhatsApp number. You scan its QR code on the next page.</p>
        <form method="post" action="/phones" class="inline" style="max-width:520px">
          ${csrfField(ctx.csrf)}
          <input type="text" name="name" placeholder="Name, e.g. emilia" aria-label="Name of the phone" required pattern="[A-Za-z0-9_\\-]+" maxlength="40">
          <button class="primary" type="submit">Add phone</button>
        </form>
      </div>
    </section>`
  );
}

function channelRows(phone, csrf) {
  const base = phoneUrl(phone.name);

  return phone.channels
    .map((channel, row) => {
      const id = `ch-${row}`;

      const manage = canPost(channel)
        ? `<button type="button" class="small" data-dialog="test-dialog-${row}">Test post</button>
          <dialog id="test-dialog-${row}" aria-labelledby="test-title-${row}">
            <form method="post" action="${base}/channels/test" class="stack">
              ${csrfField(csrf)}<input type="hidden" name="id" value="${esc(channel.id)}">
              <h2 id="test-title-${row}" style="font-size:17px">Test post in “${esc(channel.name)}”</h2>
              <div><label for="test-${row}">Text to publish</label>
              <textarea id="test-${row}" name="text" rows="4" required maxlength="1000">Test post from the WhatsApp Gateway</textarea></div>
              <p class="sub">This is published for real and followers of the channel will see it.</p>
              <div class="row" style="justify-content:flex-end">
                <button type="button" data-close-dialog>Cancel</button>
                <button type="submit" class="primary">Publish test post</button>
              </div>
            </form>
          </dialog>
          ${
            channel.role === 'owner'
              ? action(`${base}/channels/delete`, csrf, 'Delete', {
                  cls: 'small danger',
                  fields: { id: channel.id },
                  confirmTitle: 'Delete this channel?',
                  confirmWord: 'DELETE',
                  confirm: `"${channel.name}" will be deleted from WhatsApp for everyone. This cannot be undone.`,
                })
              : ''
          }`
        : action(`${base}/channels/forget`, csrf, 'Remove', { cls: 'small', fields: { id: channel.id } });

      return `<tr>
        <td><span class="name">${esc(channel.name)}</span>${
          channel.invite_code
            ? `<br><a href="https://whatsapp.com/channel/${esc(channel.invite_code)}" target="_blank" rel="noopener" style="font-size:13px">Open channel ↗</a>`
            : ''
        }</td>
        <td>${accessBadge(channel)}</td>
        <td><div class="field" style="min-width:300px"><input class="mono" type="text" id="${id}" value="${esc(channel.id)}" readonly aria-label="Channel ID of ${esc(channel.name)}"><button type="button" class="small" data-copy="${id}">Copy</button></div></td>
        <td class="right"><div class="row" style="justify-content:flex-end">${manage}</div></td>
      </tr>`;
    })
    .join('');
}

export function phonePage(ctx) {
  const { phone, csrf } = ctx;
  const base = phoneUrl(phone.name);
  const linked = phone.status === 'AUTH';

  const connection = linked
    ? `<div class="row" style="justify-content:space-between">
        <div><p class="label">WhatsApp number</p><p style="font-size:20px;font-weight:700">+${esc(phone.phone)}</p></div>
        ${action(`${base}/unlink`, csrf, 'Unlink phone', { confirmTitle: 'Unlink this phone?', confirm: 'Posting stops until a phone is linked again by QR code.' })}
      </div>`
    : phone.qr
      ? `<div class="qr">
          <img src="${phone.qr}" alt="QR code to link WhatsApp" data-qr>
          <div>
            <ol><li>Open WhatsApp on the phone.</li><li>Go to Settings → Linked devices.</li><li>Tap “Link a device” and scan this code.</li></ol>
            <p class="sub" style="margin-top:12px">The code refreshes by itself. The number must be owner or admin of the channels it will post to.</p>
          </div>
        </div>`
      : '<p class="sub">Starting… the QR code appears in a few seconds.</p>';

  const channels = !linked
    ? ''
    : `<section class="card">
        <div class="card-head"><h2>Channels of this phone</h2><div class="row"><span class="sub">${phone.postable} ready to post</span>${action(`${base}/channels/refresh`, csrf, 'Refresh', { cls: 'small' })}</div></div>
        ${
          phone.channels.length === 0
            ? '<p class="empty">This phone is not owner or admin of any WhatsApp Channel yet. Create one below, or add an existing one.</p>'
            : `<div class="table-wrap"><table>
                <thead><tr><th>Channel</th><th>Access</th><th>Channel ID</th><th class="right"></th></tr></thead>
                <tbody>${channelRows(phone, csrf)}</tbody>
              </table></div>`
        }
      </section>

      <div class="two">
        <section class="card">
          <div class="card-head"><h2>Create a new channel</h2></div>
          <form class="card-body stack" method="post" action="${base}/channels/create" style="max-width:none">
            ${csrfField(csrf)}
            <div><label for="channel_name">Channel name</label><input type="text" id="channel_name" name="channel_name" required minlength="2" maxlength="100"></div>
            <div><label for="description">Description (optional)</label><textarea id="description" name="description" rows="3" maxlength="2000"></textarea></div>
            <p class="sub">The channel is created on WhatsApp and owned by +${esc(phone.phone)}.</p>
            <div><button type="submit" class="primary">Create channel</button></div>
          </form>
        </section>

        <section class="card">
          <div class="card-head"><h2>Add an existing channel</h2></div>
          <form class="card-body stack" method="post" action="${base}/channels/lookup" style="max-width:none">
            ${csrfField(csrf)}
            <div><label for="link">Channel link</label><input type="text" id="link" name="link" placeholder="https://whatsapp.com/channel/…" required></div>
            <p class="sub">Checks the channel and tells you whether +${esc(phone.phone)} can post there. Channels where it is owner or admin appear in the list by themselves.</p>
            <div><button type="submit">Check channel</button></div>
          </form>
        </section>
      </div>`;

  return layout(
    ctx,
    {
      title: phone.name,
      heading: phone.name,
      crumb: '<a class="crumb" href="/phones">← Phones</a>',
      actions: statusBadge(phone.status),
    },
    `<section class="card" data-phone="${esc(phone.name)}" data-status="${esc(phone.status)}" data-wants-qr>
      <div class="card-head"><h2>Connection</h2></div>
      <div class="card-body">${connection}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>API token</h2>${action(`${base}/token`, csrf, 'Create new token', { cls: 'small', confirmTitle: 'Create a new API token?', confirm: 'The current token stops working immediately, so the admin portal needs the new one.' })}</div>
      <div class="card-body" style="display:grid;gap:8px">
        ${copyField('token', phone.token, { secret: true, label: 'API token' })}
        <p class="sub">Paste it into the admin portal → WhatsApp Channels → Edit → “Gateway API token”.</p>
      </div>
    </section>

    ${channels}

    <section class="card">
      <div class="card-head"><h2>Delete this phone</h2></div>
      <div class="card-body row" style="justify-content:space-between">
        <p class="sub" style="max-width:560px">Removes the phone, its API token and its WhatsApp login from the gateway. The channels themselves stay on WhatsApp.</p>
        ${action(`${base}/delete`, csrf, 'Delete phone', { cls: 'danger', confirmTitle: 'Delete this phone?', confirmWord: 'DELETE', confirm: `"${phone.name}", its API token and its WhatsApp login will be removed from the gateway.` })}
      </div>
    </section>`
  );
}

export function channelsPage(ctx) {
  const rows = ctx.phones.flatMap((phone) => phone.channels.map((channel) => ({ phone, channel })));

  return layout(
    ctx,
    { title: 'Channels', heading: 'Channels', intro: 'Every WhatsApp Channel known to the gateway, across all phones.' },
    `<section class="card">
      ${
        rows.length === 0
          ? '<p class="empty">No channels yet. Open a phone to create a channel or add an existing one.</p>'
          : `<div class="table-wrap"><table>
              <thead><tr><th>Channel</th><th>Phone</th><th>Access</th><th>Channel ID</th><th class="right"></th></tr></thead>
              <tbody>${rows
                .map(
                  ({ phone, channel }, row) => `<tr>
                    <td><span class="name">${esc(channel.name)}</span>${
                      channel.invite_code
                        ? `<br><a href="https://whatsapp.com/channel/${esc(channel.invite_code)}" target="_blank" rel="noopener" style="font-size:13px">Open channel ↗</a>`
                        : ''
                    }</td>
                    <td><a href="${phoneUrl(phone.name)}">${esc(phone.name)}</a><br><span class="sub">${phoneLabel(phone)}</span></td>
                    <td>${accessBadge(channel)}</td>
                    <td><div class="field" style="min-width:300px"><input class="mono" type="text" id="all-${row}" value="${esc(channel.id)}" readonly aria-label="Channel ID of ${esc(channel.name)}"><button type="button" class="small" data-copy="all-${row}">Copy</button></div></td>
                    <td class="right"><a class="btn small" href="${phoneUrl(phone.name)}">Manage</a></td>
                  </tr>`
                )
                .join('')}</tbody>
            </table></div>`
      }
    </section>
    <p class="sub">To create a channel or add an existing one, open the phone that should own or administer it under <a href="/phones">Phones</a>.</p>`
  );
}

export function apiPage(ctx) {
  const sampleChannel = ctx.phones.flatMap((phone) => phone.channels).find(canPost)?.id || '120363171744447809@newsletter';

  return layout(
    ctx,
    { title: 'API reference', heading: 'API reference', intro: 'The HTTP API the admin portal uses to publish posts.' },
    `<section class="card">
      <div class="card-head"><h2>Base URL and authentication</h2></div>
      <div class="card-body" style="display:grid;gap:12px">
        ${copyField('base-url', ctx.baseUrl, { label: 'Gateway URL' })}
        <p class="sub">Every request needs the header <code>Authorization: Bearer &lt;API token&gt;</code>. Each phone has its own token, shown on its page under <a href="/phones">Phones</a>. Errors come back as <code>{"error": {"code", "message", "details"}}</code>.</p>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Endpoints</h2></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Method</th><th>Path</th><th>JSON body</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/health</code></td><td>—</td><td>Link status of the phone</td></tr>
          <tr><td>GET</td><td><code>/newsletters</code></td><td>—</td><td>Channels of the phone, with IDs and role</td></tr>
          <tr><td>GET</td><td><code>/newsletters/invite/{code}</code></td><td>—</td><td>Channel behind a whatsapp.com/channel/{code} link</td></tr>
          <tr><td>POST</td><td><code>/newsletters</code></td><td><code>name</code>, <code>description</code></td><td>Create a channel</td></tr>
          <tr><td>DELETE</td><td><code>/newsletters/{id}</code></td><td>—</td><td>Delete a channel the phone owns</td></tr>
          <tr><td>POST</td><td><code>/messages/text</code></td><td><code>to</code>, <code>body</code></td><td>Text post</td></tr>
          <tr><td>POST</td><td><code>/messages/image</code></td><td><code>to</code>, <code>media</code>, <code>caption</code></td><td>Photo post (media = image URL)</td></tr>
          <tr><td>POST</td><td><code>/messages/link_preview</code></td><td><code>to</code>, <code>body</code>, <code>canonical</code>, <code>title</code>, <code>description</code>, <code>media</code></td><td>Text post with a link card</td></tr>
        </tbody>
      </table></div>
    </section>

    <section class="card">
      <div class="card-head"><h2>Example</h2></div>
      <div class="card-body"><pre>curl -X POST ${esc(ctx.baseUrl)}/messages/text \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "${esc(sampleChannel)}", "body": "Hello from the gateway"}'</pre>
      <p class="sub" style="margin-top:10px"><code>to</code> is the channel ID. A successful send returns <code>{"sent": true, "confirmed": true, "message": {"id": "…"}}</code>.</p></div>
    </section>`
  );
}

export function settingsPage(ctx) {
  return layout(
    ctx,
    { title: 'Settings', heading: 'Settings', intro: 'Your sign-in for this admin panel.' },
    `<section class="card">
      <div class="card-head"><h2>Change password</h2></div>
      <form method="post" action="/settings/password" class="card-body stack">
        ${csrfField(ctx.csrf)}
        <p class="sub">The username is <b>admin</b>. Changing the password signs out every other browser.</p>
        <div><label for="current">Current password</label><input type="password" id="current" name="current" autocomplete="current-password" required></div>
        <div><label for="password">New password (at least 10 characters)</label><input type="password" id="password" name="password" autocomplete="new-password" minlength="10" required></div>
        <div><label for="confirm">Repeat new password</label><input type="password" id="confirm" name="confirm" autocomplete="new-password" minlength="10" required></div>
        <div><button class="primary" type="submit">Change password</button></div>
      </form>
    </section>`
  );
}

export function notFoundPage(ctx) {
  return layout(
    ctx,
    { title: 'Not found', heading: 'Phone not found', crumb: '<a class="crumb" href="/phones">← Phones</a>' },
    '<section class="card"><p class="empty">This phone does not exist any more.</p></section>'
  );
}
