#!/usr/bin/env python3
"""
Blog builder. Turns your posts (blog/posts/*.md) into web pages.

    python3 blog/build.py          build everything (run from the repo folder)

What it does:
  1. Shrinks big photos in blog/img/ (max 1600 px wide) so pages load fast on phones.
  2. Makes blog/index.html (the list of posts) and one page per post: blog/<post-name>.html
  3. Skips posts with  draft: true  at the top.

You never edit the .html files in blog/. They are rebuilt every time.
GitHub runs this script for you on every push, so the live site is always up to date.
Needs:  pip install markdown pillow
"""
import html
import json
import re
import sys
from datetime import date, datetime
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parent.parent
BLOG = ROOT / "blog"
POSTS = BLOG / "posts"
IMG = BLOG / "img"
SITE = "https://pankqx.github.io/pankqx/"
CHALLENGE = 100          # the "Day N / 100" challenge length
MAX_W = 1600             # photos wider than this get shrunk


# ---------- 1 · photos ----------
def shrink_photos():
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("  (pillow not installed: photos were not shrunk. Run: pip install pillow)")
        return
    for p in IMG.rglob("*"):
        if p.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        try:
            im = Image.open(p)
            im = ImageOps.exif_transpose(im)          # phone photos: keep them the right way up
            big = im.width > MAX_W
            heavy = p.stat().st_size > 450_000
            if not (big or heavy):
                continue
            if big:
                im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
            if p.suffix.lower() in (".jpg", ".jpeg"):
                im.convert("RGB").save(p, quality=82, optimize=True, progressive=True)
            elif p.suffix.lower() == ".webp":
                im.save(p, quality=80)
            else:
                im.save(p, optimize=True)
            print(f"  shrunk {p.relative_to(ROOT)}  ->  {p.stat().st_size // 1024} KB")
        except Exception as e:                       # a broken photo should never stop the build
            print(f"  could not read {p.name}: {e}")


# ---------- 2 · reading one post ----------
def read_post(path):
    raw = path.read_text(encoding="utf-8")
    meta, body = {}, raw
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", raw, re.S)
    if m:
        for line in m.group(1).splitlines():
            if ":" in line and not line.strip().startswith("#"):
                k, v = line.split(":", 1)
                meta[k.strip().lower()] = v.strip().strip('"').strip("'")
        body = m.group(2)
    if meta.get("draft", "").lower() in ("true", "yes", "1"):
        return None
    slug = re.sub(r"[^a-z0-9-]+", "-", path.stem.lower()).strip("-")
    try:
        d = datetime.strptime(meta.get("date", ""), "%Y-%m-%d").date()
    except ValueError:
        d = date.fromtimestamp(path.stat().st_mtime)
    words = len(re.findall(r"\w+", re.sub(r"!\[.*?\]\(.*?\)", "", body)))
    return {
        "slug": slug,
        "title": meta.get("title", path.stem),
        "subtitle": meta.get("subtitle", ""),
        "date": d,
        "day": int(meta["day"]) if meta.get("day", "").isdigit() else None,
        "tag": meta.get("tag", "100 days of AI" if meta.get("day") else "Notes"),
        "cover": img_url(meta.get("cover", "")),
        "cover_caption": meta.get("cover_caption", ""),
        "mins": max(1, round(words / 200)),
        "body": body,
    }


def img_url(src):
    """Posts live in blog/posts/, pages in blog/. Point every photo path at blog/img/."""
    src = src.strip()
    if not src or re.match(r"^(https?:)?//", src):
        return src
    src = src.replace("\\", "/")
    src = re.sub(r"^(\.\./)+", "", src)               # ../img/x.jpg  ->  img/x.jpg
    src = re.sub(r"^blog/", "", src)
    return "blog/" + src if not src.startswith("blog/") else src


# ---------- 3 · the special blocks ----------
FIG = re.compile(r"^!\[(.*?)\]\((.*?)\)\s*$")


def figure(alt, src, cls="fig-in"):
    cap = f"<figcaption>{html.escape(alt)}</figcaption>" if alt else ""
    return (f'<figure class="{cls}"><img src="{html.escape(img_url(src))}" alt="{html.escape(alt)}" '
            f'loading="lazy" decoding="async">{cap}</figure>')


def md(text):
    out = markdown.markdown(text, extensions=["extra", "sane_lists"], output_format="html")
    return re.sub(r'<img alt="(.*?)" src="(.*?)" />', lambda m: f'<img alt="{m.group(1)}" src="{img_url(html.unescape(m.group(2)))}" loading="lazy">', out)


def render_body(body):
    """Markdown plus a few photo-essay blocks:
       ::: side       a photo and a paragraph side by side
       ::: gallery    2 to 4 photos in a grid
       ::: takeaways  a boxed list (add a title after the word if you like)
       ::: sources    small print at the end
       ::: note       a soft highlighted box
       > quote        a big pull quote  (a last line starting with - or — is the credit)
       a photo on its own line  ->  photo with caption
       a YouTube link on its own line  ->  video
    """
    lines, out, i = body.splitlines(), [], 0
    buf = []

    def flush():
        if buf:
            out.append(md("\n".join(buf)))
            buf.clear()

    while i < len(lines):
        line = lines[i]
        s = line.strip()
        blk = re.match(r"^:::\s*(\w+)\s*(.*)$", s)
        if blk:
            flush()
            kind, title = blk.group(1).lower(), blk.group(2).strip()
            inner = []
            i += 1
            while i < len(lines) and lines[i].strip() != ":::":
                inner.append(lines[i])
                i += 1
            i += 1
            out.append(render_block(kind, title, inner))
            continue
        f = FIG.match(s)
        if f:
            flush()
            out.append(figure(f.group(1), f.group(2)))
            i += 1
            continue
        yt = re.match(r"^https?://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([\w-]{11})\S*$", s)
        if yt:
            flush()
            out.append(f'<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/{yt.group(1)}" title="Video" loading="lazy" allowfullscreen></iframe></div>')
            i += 1
            continue
        if s.startswith(">"):
            flush()
            q = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                q.append(lines[i].strip()[1:].strip())
                i += 1
            credit = ""
            if len(q) > 1 and re.match(r"^[-—–]", q[-1]):
                credit = f"<small>{html.escape(q.pop().lstrip('-—– '))}</small>"
            out.append(f'<blockquote class="pull"><p>{md(" ".join(q))[3:-4]}</p>{credit}</blockquote>')
            continue
        buf.append(line)
        i += 1
    flush()
    return "\n".join(out)


def render_block(kind, title, inner):
    text = "\n".join(inner).strip()
    if kind == "side":
        pics = [FIG.match(l.strip()) for l in inner if FIG.match(l.strip())]
        rest = "\n".join(l for l in inner if not FIG.match(l.strip()))
        pic = figure(pics[0].group(1), pics[0].group(2), "fig-side") if pics else ""
        return f'<div class="side">{pic}<div>{md(rest)}</div></div>'
    if kind == "gallery":
        pics = [FIG.match(l.strip()) for l in inner if FIG.match(l.strip())]
        items = "".join(f'<img src="{html.escape(img_url(p.group(2)))}" alt="{html.escape(p.group(1))}" loading="lazy">' for p in pics)
        caps = " · ".join(p.group(1) for p in pics if p.group(1))
        cap = f"<figcaption>{html.escape(title or caps)}</figcaption>" if (title or caps) else ""
        return f'<figure class="gal n{min(len(pics), 4)}">{items}{cap}</figure>'
    if kind == "takeaways":
        return f'<aside class="take"><h4>{html.escape(title or "Things to remember")}</h4>{md(text)}</aside>'
    if kind == "sources":
        return f'<div class="src"><h4>{html.escape(title or "Sources")}</h4>{md(text)}</div>'
    if kind == "note":
        return f'<aside class="note">{md(text)}</aside>'
    return md(text)                                   # unknown block: just show the text


# ---------- 4 · page shell (borrowed from play.html so the bar and menu always match) ----------
def shell():
    src = (ROOT / "play.html").read_text(encoding="utf-8")
    head, rest = src.split("<main id=\"main\">", 1)
    tail = rest.split("</main>", 1)[1]
    return head, tail


def page(title, desc, url, image, content, body_cls, extra_head=""):
    head, tail = shell()
    head = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", head)
    for prop in ("name=\"description\"", "property=\"og:description\""):
        head = re.sub(rf'(<meta {prop} content=")[^"]*', lambda m: m.group(1) + html.escape(desc, quote=True), head)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*', lambda m: m.group(1) + html.escape(title, quote=True), head)
    head = re.sub(r'(<link rel="canonical" href=")[^"]*', lambda m: m.group(1) + url, head)
    head = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + url, head)
    head = head.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">' if "post" in body_cls else '<meta property="og:type" content="website">')
    if image:
        head = re.sub(r'(<meta property="og:image" content=")[^"]*', lambda m: m.group(1) + SITE + image, head)
    head = head.replace("<head>", '<head>\n<base href="../">', 1)
    head = head.replace("</head>", '<link rel="preload" href="assets/fonts/newsreader-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>\n'
                        '<link rel="stylesheet" href="assets/css/blog.css?v=__V__">\n' + extra_head + "</head>")
    head = head.replace('<body class="pg-play">', f'<body class="pg-blog {body_cls}">')
    here = url.replace(SITE, "")
    doc = head + '<main id="main">\n' + content + "\n</main>" + tail
    return doc.replace('href="#main"', f'href="{here}#main"')   # <base> would send #main to the home page


def esc(s):
    return html.escape(s, quote=True)


def card(p, cls="post"):
    label = f"DAY {p['day']:02d}" if p["day"] else p["tag"].upper()
    ph = f'<img src="{esc(p["cover"])}" alt="" loading="lazy">' if p["cover"] else '<span class="ph-none" aria-hidden="true">' + esc(p["title"][:1]) + "</span>"
    sub = f'<p>{esc(p["subtitle"])}</p>' if p["subtitle"] and cls == "feat" else ""
    when = p["date"].strftime("%-d %b %Y") if sys.platform != "win32" else p["date"].strftime("%#d %b %Y")
    return (f'<a class="{cls} rv" href="blog/{p["slug"]}.html" data-tag="{esc(p["tag"])}"><div class="ph">{ph}</div>'
            f'<div class="t"><span class="day">{label}{" · LATEST" if cls == "feat" else ""}</span><h3>{esc(p["title"])}</h3>{sub}'
            f'<span class="meta mono">{p["mins"]} min read · {when}</span></div></a>')


def build_index(posts):
    days = [p["day"] for p in posts if p["day"]]
    done = max(days) if days else 0
    dots = "".join(f'<i class="{"d" if n < done else ""}"></i>' for n in range(CHALLENGE))
    tags = []
    for p in posts:
        if p["tag"] not in tags:
            tags.append(p["tag"])
    filters = ""
    if len(tags) > 1:
        filters = '<div class="filters rv" role="group" aria-label="Filter posts"><button type="button" class="on" data-f="">All</button>' + \
            "".join(f'<button type="button" data-f="{esc(t)}">{esc(t)}</button>' for t in tags) + "</div>"
    if posts:
        listing = card(posts[0], "feat") + '<div class="grid">' + "".join(card(p) for p in posts[1:]) + "</div>"
    else:
        listing = '<div class="empty rv"><p class="serif">Day 1 is coming soon.</p><p>The first post goes up next week. Check back, or follow along on LinkedIn.</p></div>'
    content = f'''<section class="sheet page-top" id="blog" data-sheet="B1" data-title="Blog">
<div class="wrap">
<header class="sh rv"><span class="sh-no">B1</span><span class="sh-label">Blog · 100 days of AI</span></header>
<div class="b-head">
<h2 class="h2 rv">One day, <span class="serif">one idea.</span></h2>
<p class="lede rv">Every day for 100 days I spend an hour on what’s new in AI and write it down in simple words. Photos, notes and what I think.</p>
<div class="prog rv"><span class="mono">Day {done} / {CHALLENGE}</span><div class="prog-bar"><i style="width:{done / CHALLENGE * 100:.1f}%"></i></div></div>
<div class="dots rv" aria-hidden="true">{dots}</div>
</div>
{filters}
{listing}
{FOOT}
</div>
</section>'''
    return page("Blog · K S Pankaj", "100 days of AI: one idea a day, in simple words, with photos. By K S Pankaj.",
                SITE + "blog/", posts[0]["cover"] if posts else "", content, "pg-blog-list")


def build_post(p, prev, nxt):
    when = p["date"].strftime("%-d %b %Y") if sys.platform != "win32" else p["date"].strftime("%#d %b %Y")
    label = f"Day {p['day']} / {CHALLENGE}" if p["day"] else p["tag"]
    url = SITE + f"blog/{p['slug']}.html"
    cover = (f'<div class="cover-ph"><img src="{esc(p["cover"])}" alt="{esc(p["cover_caption"])}" fetchpriority="high"></div>'
             if p["cover"] else "")
    hero_cls = "p-hero has-cover" if p["cover"] else "p-hero"
    sub = f'<p class="p-sub">{esc(p["subtitle"])}</p>' if p["subtitle"] else ""
    nav = '<nav class="p-nav" aria-label="More posts">'
    nav += f'<a href="blog/{prev["slug"]}.html"><small>← Older</small>{esc(prev["title"])}</a>' if prev else "<span></span>"
    nav += f'<a class="r" href="blog/{nxt["slug"]}.html"><small>Newer →</small>{esc(nxt["title"])}</a>' if nxt else "<span></span>"
    nav += "</nav>"
    share = "https://www.linkedin.com/sharing/share-offsite/?url=" + url
    content = f'''<div class="readbar" aria-hidden="true"></div>
<article id="post" data-sheet="B2" data-title="Blog">
<header class="{hero_cls}">{cover}
<div class="p-head"><span class="mono">{esc(label)} · {p["mins"]} min read · {when}</span>
<h1>{esc(p["title"])}</h1>{sub}</div></header>
{f'<p class="cover-cap">{esc(p["cover_caption"])}</p>' if p["cover"] and p["cover_caption"] else ""}
<div class="essay">
{render_body(p["body"])}
</div>
<div class="p-end">
<div class="p-share"><a class="btn btn-ghost btn-sm" href="{share}" target="_blank" rel="noopener">Share on LinkedIn</a><button class="btn btn-ghost btn-sm" type="button" data-copy="{url}">Copy link</button><a class="btn btn-sm" href="contact.html">Say hi</a></div>
{nav}
<a class="mono back" href="blog/">← All posts</a>
</div>
</article>
<div class="wrap">{FOOT}</div>'''
    desc = p["subtitle"] or re.sub(r"\s+", " ", re.sub(r"[#>*_\[\]()!:]", "", p["body"]))[:150]
    return page(f'{p["title"]} · K S Pankaj', desc, url, p["cover"], content, "pg-post")


FOOT = ""


def main():
    global FOOT
    FOOT = re.search(r'<div class="foot mono">.*?</div>', (ROOT / "play.html").read_text(encoding="utf-8"), re.S).group(0)
    print("Blog build")
    shrink_photos()
    posts = [p for p in (read_post(f) for f in sorted(POSTS.glob("*.md")) if not f.name.startswith("_")) if p]
    posts.sort(key=lambda p: (p["date"], p["day"] or 0), reverse=True)
    for old in BLOG.glob("*.html"):
        old.unlink()
    (BLOG / "index.html").write_text(build_index(posts), encoding="utf-8")
    for k, p in enumerate(posts):
        nxt = posts[k - 1] if k > 0 else None
        prev = posts[k + 1] if k + 1 < len(posts) else None
        (BLOG / f"{p['slug']}.html").write_text(build_post(p, prev, nxt), encoding="utf-8")
        print(f"  page  blog/{p['slug']}.html")
    (BLOG / "posts.json").write_text(json.dumps([{"title": p["title"], "url": f"blog/{p['slug']}.html", "day": p["day"],
                                                   "date": p["date"].isoformat()} for p in posts], indent=1), encoding="utf-8")
    print(f"Done: {len(posts)} post(s). Open blog/index.html with Live Server to check.")


if __name__ == "__main__":
    main()
