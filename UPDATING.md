# Updating the portfolio

Everything below can be done in the GitHub website, even from your phone: open a file, tap the pencil (✏️) icon, edit, then **Commit changes**. About 2–3 minutes later the live site at https://pankqx.github.io/pankqx/ updates by itself. You can watch progress in the **Actions** tab: a green tick means it's live, and a red cross means something broke. If it breaks, the old version stays online.

---

## Resumes

The three PDFs are built from the LaTeX files in [`resume/`](resume/). **Don't upload PDFs by hand.** Edit the `.tex` files, commit, and GitHub rebuilds all three PDFs and the on-page previews for you.

| What you want to change | File |
|---|---|
| Name, email, website, LinkedIn, GitHub | `resume/data/personal.tex` |
| Experience, project bullets, education, certifications, hackathons, strengths (shared by all three resumes) | `resume/jobs/site_common.tex` |
| AI Full-Stack Engineer: title, profile, skills, which projects appear | `resume/jobs/site_aifs.tex` |
| Full-Stack Engineer: title, profile, skills, which projects appear | `resume/jobs/site_fullstack.tex` |
| AI Engineer: title, profile, skills, which projects appear | `resume/jobs/site_ai.tex` |

**Adding a new project to the resumes:** in `site_common.tex`, copy one of the `\newcommand{\pTonefer}{...}` blocks, rename it (for example `\pMyProject`), and change the text. Then list it inside `\projectsContent` in whichever `site_*.tex` files should show it.

**LaTeX gotchas:** write `&` as `\&`, `%` as `\%` and `#` as `\#`. Keep each resume to one page. If one spills onto a second page, the build log shows a yellow warning, so shorten a bullet.

**Building on your laptop (optional):** run `bash resume/build.sh`. It needs TeX Live with fontawesome5, plus `poppler-utils` and `webp`.

---

## Projects on the site

The site has two pages. **`index.html`** (Home) holds your projects and resumes, and **`about.html`** holds everything about you. For projects, edit `index.html` and search (Ctrl+F) for the markers below.

### Edit a featured project

Search for `<!-- 02 · WORK -->`. Each of the six featured projects is one block that starts with `<div class="pj">`. Inside it:

| Part | What it is |
|---|---|
| `<span class="t">Tonefer</span>` | the name in the list |
| `<span class="k">Desktop + Android</span>` | the small label next to the name |
| `<span class="pj-badge mono">Released</span>` | the orange badge on the drawing |
| `<p class="pj-quip">…</p>` | the funny one-liner |
| the `<p>` right after it | the description |
| `<span class="pj-stack">…</span>` | the stack line |
| `<a class="link" href="…">Live …</a>` | the links. Copy one to add more, delete one to remove it |

Leave the `<svg …>…</svg>` drawing inside `pj-art` as it is.

### Swap in a new featured project

Keep it at **six** featured projects, because the layout is designed for six. To feature a new one, overwrite the text of the project you want to replace. Change its `id="pjh-…"`, `aria-controls="pjb-…"`, `id="pjb-…"` and `aria-labelledby="pjh-…"` to a new matching name (all four must match), and move the old project into "Also built". The new project keeps the old drawing until you ask Claude to draw a new one in the same style.

### Add a project to "Also built"

Search for `Also built`. Copy one link, including the dot after it, and paste it where you want it:

```html
<a href="https://github.com/pankqx/your-repo" target="_blank" rel="noopener" data-cursor="OPEN ↗">Your Project</a><i>·</i>
```

### Numbers and the ProntoPy band

- Hero numbers: search for `class="stats`. Change both the `data-count="30"` attribute and the number between the tags.
- ProntoPy numbers: search for `class="specs"`.

---

## The About page (`about.html`)

| What you want to change | Search for |
|---|---|
| The typed intro ("$ cat about.txt") | `class="term-body"`, then edit the `<p>` lines |
| Fast learner / Adaptable / Team player / Creative | `class="trait trait-a`, then edit the `<h3>` title and the `<p>` text |
| Experience (the git log) | `class="gl-row`. Each job is one row: `gl-h` is the fake commit code, `gl-w` the date, `gl-t` the title, and the `<p>` the line under it. To add a job, copy a whole row that starts with `<span class="gl-g"><b>*</b>` |
| Toolbox | `class="tr-row`. Each folder is one row, and each tool is a `<span>` inside `tr-items` |
| Contact | `<!-- 05 · CONTACT -->` |

The letter animations (the progress bar, shapes, high five and drawing), the HTTP Dino game and the page wipe live in `assets/js/site.js`. Leave those to Claude unless you want to experiment.
