/* Edit mode. Open any v2 page with ?edit on the end, tap text and type, then Publish.
   Publish saves the page to GitHub with your key. The key is kept only in this browser. */
(() => {
  const REPO = 'pankqx/pankqx';
  const FILE = 'v2/' + (location.pathname.split('/').pop() || 'index.html');
  const API = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
  const main = document.getElementById('main');
  let key = '', sha = '', source = '', dirty = false, picked = null, linkEl = null;
  try { key = localStorage.getItem('ksp-edit-key') || ''; } catch (e) { /* no storage */ }

  const bar = document.createElement('div');
  bar.id = 'editbar';
  bar.innerHTML = '<input id="eb-link" type="url" placeholder="Link address: select words or tap a link first" aria-label="Link address"><button id="eb-set" type="button">Set link</button><button id="eb-dup" type="button">Copy block</button><button id="eb-del" type="button">Delete block</button><button id="eb-pub" class="go" type="button">Publish</button><span class="msg" id="eb-msg"></span>';
  document.body.appendChild(bar);
  document.body.classList.add('editing');
  const $ = (id) => document.getElementById(id);
  const say = (t) => { $('eb-msg').textContent = t; };
  const headers = () => ({ Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + key });
  const decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const encode = (text) => { let s = ''; new TextEncoder().encode(text).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };

  const askKey = () => {
    say('Paste your GitHub key in the box and press Publish. It is saved only in this browser.');
    $('eb-link').placeholder = 'Paste GitHub key here'; $('eb-link').type = 'password'; $('eb-link').value = ''; $('eb-link').dataset.mode = 'key';
  };
  const linkMode = () => { const i = $('eb-link'); i.type = 'url'; i.placeholder = 'Link address: select words or tap a link first'; i.value = ''; delete i.dataset.mode; };

  /* always start from the newest saved copy, not the copy this browser happens to have */
  const load = async () => {
    if (!key) { askKey(); return false; }
    say('Loading the latest saved version…');
    const r = await fetch(API + '?ref=main&t=' + Date.now(), { headers: headers() });
    if (r.status === 401 || r.status === 403) { key = ''; askKey(); say('That key was not accepted. Paste a new one and press Publish.'); return false; }
    if (!r.ok) { say('Could not load from GitHub (' + r.status + '). Check your connection and reload.'); return false; }
    const j = await r.json();
    sha = j.sha; source = decode(j.content);
    const fresh = new DOMParser().parseFromString(source, 'text/html').getElementById('main');
    if (fresh) main.innerHTML = fresh.innerHTML;
    say('Editing ' + FILE + '. Tap any text and type. Publish when done; the live site updates in about 4 minutes.');
    return true;
  };

  main.contentEditable = 'true';
  main.spellcheck = true;
  main.addEventListener('input', () => { dirty = true; });
  main.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain')); });
  main.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) e.preventDefault();                       // links do not open while editing
    if ($('eb-link').dataset.mode !== 'key') { linkEl = a; $('eb-link').value = a ? a.getAttribute('href') : ''; }
    if (picked) picked.classList.remove('picked');
    picked = e.target.closest('[data-block]');
    if (picked) picked.classList.add('picked');
  });
  $('eb-set').addEventListener('click', () => {
    if ($('eb-link').dataset.mode === 'key') return;
    const url = $('eb-link').value.trim();
    if (!url) { say('Type the link address first.'); return; }
    if (linkEl) linkEl.setAttribute('href', url);
    else if (String(getSelection())) document.execCommand('createLink', false, url);
    else { say('Select some words first, or tap an existing link.'); return; }
    dirty = true; say('Link set.');
  });
  $('eb-dup').addEventListener('click', () => {
    if (!picked) { say('Tap a project or job first, then Copy block.'); return; }
    const copy = picked.cloneNode(true); copy.classList.remove('picked');
    picked.after(copy); dirty = true; say('Copied. Edit the new one below it.');
  });
  $('eb-del').addEventListener('click', () => {
    if (!picked) { say('Tap a project or job first, then Delete block.'); return; }
    picked.remove(); picked = null; dirty = true; say('Deleted. Reload the page without publishing to undo.');
  });
  $('eb-pub').addEventListener('click', async () => {
    if ($('eb-link').dataset.mode === 'key') {
      key = $('eb-link').value.trim();
      if (!key) { say('Paste the key first.'); return; }
      try { localStorage.setItem('ksp-edit-key', key); } catch (e) { /* no storage */ }
      linkMode();
      await load();
      return;
    }
    if (!source && !(await load())) return;
    const copy = main.cloneNode(true);
    copy.querySelectorAll('.picked').forEach((el) => el.classList.remove('picked'));
    copy.querySelectorAll('[class=""]').forEach((el) => el.removeAttribute('class'));
    const open = source.match(/<main[^>]*>/);
    if (!open) { say('This page has no editable area. Nothing was saved.'); return; }
    const next = source.replace(/<main[^>]*>[\s\S]*<\/main>/, () => open[0] + '\n' + copy.innerHTML.trim() + '\n</main>');
    say('Publishing…');
    const r = await fetch(API, { method: 'PUT', headers: headers(), body: JSON.stringify({ message: 'Edit ' + FILE + ' from the site', content: encode(next), sha, branch: 'main' }) });
    if (r.status === 409 || r.status === 422) { say('The page changed somewhere else since you opened it. Copy your new text, reload, and edit again.'); return; }
    if (!r.ok) { say('Publish failed (' + r.status + '). Nothing was changed. Check the key has write access to ' + REPO + '.'); return; }
    sha = (await r.json()).content.sha; source = next; dirty = false;
    say('Saved to GitHub. The live site updates in about 4 minutes.');
  });
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  load();
})();
