/* Re:U BLOG — Pages CMS posts in the public heal8140/ReU repository.
 * The Pages CMS repository is separate from the Re:U website repository.
 * Only posts dated 2026 or later are displayed, to exclude the 2020 demo posts.
 * No credentials or private tokens are used. */
(() => {
  'use strict';
  const OWNER = 'heal8140';
  const REPO = 'ReU';
  const BRANCH = 'main';
  const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents/_posts?ref=${BRANCH}`;
  const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  const FIRST_DATE = '2026-01-01';
  const MAX_POSTS = 40;
  const text = (node, value) => { if (node) node.textContent = value || ''; };
  function metaValue(src) {
    let v = (src || '').trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    return v.replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  function parsePost(markdown, filename) {
    const found = markdown.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n/);
    if (!found) return null;
    const meta = {};
    for (const line of found[1].split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
      if (match) meta[match[1]] = metaValue(match[2]);
    }
    if (!meta.title) return null;
    const date = String(meta.date || (filename.match(/^\d{4}-\d{2}-\d{2}/) || [''])[0]);
    if (!/^\d{4}-\d{2}-\d{2}/.test(date) || date.slice(0, 10) < FIRST_DATE || meta.published === 'false') return null;
    return { filename, title: meta.title, excerpt: meta.excerpt || '', date, cover: meta.coverImage || '', body: markdown.slice(found[0].length) };
  }
  function safeImage(path) {
    if (!path) return '';
    if (/^https:\/\//i.test(path)) return path;
    if (path.startsWith('/assets/')) return RAW + 'public' + path;
    if (path.startsWith('assets/')) return RAW + 'public/' + path;
    return '';
  }
  async function getPost(filename) {
    const url = RAW + '_posts/' + encodeURIComponent(filename);
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error('記事の取得に失敗しました');
    return parsePost(await resp.text(), filename);
  }
  async function listFiles() {
    const resp = await fetch(API, {headers:{Accept:'application/vnd.github+json'}});
    if (!resp.ok) throw new Error('記事一覧の取得に失敗しました');
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('投稿フォルダがありません');
    return data.filter(f => f.type === 'file' && /\.mdx?$/i.test(f.name))
      .sort((a,b) => b.name.localeCompare(a.name)).slice(0, MAX_POSTS);
  }
  function dateLabel(date) {
    const v = date.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.replace(/-/g, '.') : '';
  }
  function articleUrl(name) { return 'blog-post.html?post=' + encodeURIComponent(name); }
  function card(post) {
    const a = document.createElement('a'); a.className = 'post-card'; a.href = articleUrl(post.filename);
    const img = safeImage(post.cover);
    if (img) { const image = document.createElement('img'); image.src = img; image.alt = ''; image.loading = 'lazy'; a.append(image); }
    const content = document.createElement('div'); content.className = 'post-content';
    const date = document.createElement('p'); date.className = 'post-date'; text(date, dateLabel(post.date));
    const title = document.createElement('h2'); title.className = 'post-title'; text(title, post.title);
    content.append(date,title);
    if (post.excerpt) { const p=document.createElement('p');p.className='post-excerpt';text(p,post.excerpt);content.append(p); }
    a.append(content);return a;
  }
  async function renderList() {
    const msg = document.getElementById('blog-message');
    const grid = document.getElementById('blog-list');
    try {
      const files = await listFiles();
      const all = await Promise.all(files.map(f=>getPost(f.name).catch(()=>null)));
      const posts = all.filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date));
      if (!posts.length) { text(msg, '記事はただいま準備中です。'); return; }
      msg.hidden = true;
      posts.forEach(p=>grid.append(card(p)));
    } catch(err) { text(msg, '記事を読み込めませんでした。しばらくしてから再度お試しください。'); }
  }
  async function renderPost() {
    const params = new URLSearchParams(location.search);
    const name = params.get('post') || '';
    const title = document.getElementById('article-title');
    const body = document.getElementById('article-body');
    if (!/^[^/\\]+\.mdx?$/i.test(name)) { text(title, '記事が見つかりません'); return; }
    try {
      const p = await getPost(name);
      if (!p) { text(title, 'この記事は公開されていません'); return; }
      document.title = p.title + '｜Re:U BLOG';
      text(title, p.title);
      text(document.getElementById('article-date'),dateLabel(p.date));
      const img = safeImage(p.cover);
      if (img) {const el = document.createElement('img');el.className='cover';el.alt='';el.src=img;document.getElementById('article-cover').append(el);}
      if (window.marked && window.DOMPurify) {
        body.innerHTML = window.DOMPurify.sanitize(window.marked.parse(p.body));
        body.querySelectorAll('img').forEach(image=>{ const src=safeImage(image.getAttribute('src')); if (src) image.src=src; else image.remove(); });
        body.querySelectorAll('a[href]').forEach(link=>{ const u=link.getAttribute('href'); if (!/^(https?:\/\/|\/|#)/i.test(u)) link.removeAttribute('href'); });
      } else { text(body, p.body); }
    } catch(err) {text(title, '記事を読み込めませんでした');text(body, 'しばらくしてから再度お試しください。');}
  }
  if (document.getElementById('blog-list')) renderList();
  if (document.getElementById('article-body')) renderPost();
})();
