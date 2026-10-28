# Jergušino: portfolio

Static website built with [Jekyll](https://jekyllrb.com) and the Jergusino brand guide (v5). Ink background, Cream name, Yellow pointers. Everything is flat and hard-edged: no gradients, shadows or fades. Slovak language.

GitHub Pages builds it for you. There is nothing to install to publish.

## Publish on GitHub

1. Create a **public** repository named exactly `jergusino.github.io` on the account `jergusino`.
2. Push this folder to it (branch `main`).
3. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)`** and save.
4. After a minute the site is at <https://jergusino.github.io>.

The site uses the custom domain **jergusino.com** (the `CNAME` file). Cloudflare DNS points the apex at GitHub Pages and `www` at `jergusino.github.io`.

If the repository has another name (for example `portfolio`), set `baseurl: "/portfolio"` and `url: "https://jergusino.github.io"` in `_config.yml`.

## Add a project

Every project is one file in `_projects/`. The easy way:

```bash
tools/new-project.sh "Názov projektu"
```

It creates `_projects/nazov-projektu.md` from `_templates/project.md`. Open it, fill it in, commit and push. The project appears as a card in the grid on the home page and on `/projects/`, newest first; a click opens its page. No other file needs to change.

(No Mac/Linux shell? Copy `_templates/project.md` into `_projects/` by hand and rename it.)

### Front matter

| Field | Required | What it does |
|---|---|---|
| `title` | yes | Headline of the page and the row in the list |
| `type` | yes | `plagat` (the category; new ones are added in `_data/types.yml`) |
| `date` | yes | `YYYY-MM-DD`. Sets the order and the year. **A future date hides the project** until that day |
| `summary` | no | One sentence for link previews |
| `lead` | no | Yellow script line over the title (3 words at most, lowercase). Default: the type name |
| `youtube` | no | Video ID. Shows a two-tone thumbnail that links to YouTube (nothing from YouTube loads until a visitor clicks) |
| `cover` / `cover_alt` | no | Main image (shown on the project page) |
| `thumb` | no | Smaller image for the grid card (about 720 px wide). Without it the cover is used |
| `cover_raw` | no | `true` keeps the cover in its own colours (use it for finished posters and artwork) |
| `tools` | no | List, e.g. `[Remotion, Premiere]` |
| `links` | no | List of `label` + `url`, shown as arrows under the text |
| `gallery` | no | List of `src` + `alt` |
| `tags` | no | Subject words (film, hudba, auto, miesto...). The "téma" filter on /projects/ uses the ones listed in `_data/subjects.yml`; search also looks in them |
| `color` | no | The poster's edge colour, shown while the image loads. `python3 tools/poster_colors.py` fills it in for every project |
| `similar` | no | Up to 6 project addresses (`/projects/name/`) shown as "podobné práce" at the bottom. Without it the page shows other work of the same type |
| `placeholder` | no | `true` marks a sample project. Delete the line (or the file) for real work |

The text under the front matter is Markdown.

### Images

Put images in `assets/img/projects/<project>/`. By the brand guide, photos are **two-tone**: the site turns every image into pure Ink and Cream automatically, in the browser. Your own artwork that already uses the brand colours (a poster, a motion frame) would lose its Yellow, so mark it as raw:

```markdown
![Plagát](/assets/img/projects/nazov/plagat.png){: .raw}
```

`tools/twotone.py` converts a file for real if you need it elsewhere (social posts).

### New project type

Add a block to `_data/types.yml` (`key`, `label`, `lead`). The filter on `/projects/` picks it up.

## Change the basics

Everything personal is in `_config.yml`: handle, email, Instagram link, other social links (all shown on the contact page, `kontakt/index.html`; the site has no footer) (`social:` is empty; add `label` + `url` pairs and they appear as rows on the contact page), site address.

## Preview on your computer (optional)

```bash
bundle install
bundle exec jekyll serve      # http://localhost:4000
```

Needs Ruby. Not needed to publish.

## Brand rules the code follows

- Only `#060909` Ink, `#FAF1D6` Cream, `#FFC600` Yellow. Yellow only on pointers: arrows, the @, the bar over the S, script lead-ins, the active filter.
- The wordmark is traced from the business card itself (`Front.png`), because the card's letters are edited versions of Slithen. It is in `_includes/wordmark.svg` (one path per letter); `assets/img/mark.svg` is the Š mark used as favicon. To regenerate after changing the card: `python3 -I tools/trace_card.py Front.png .`
- Home is *loud* (wordmark bottom-left at F = width/70, a third or more empty Ink); the contact page (/kontakt/) lists the email and Instagram as large rows between Yellow hairlines. The nav shows the full wordmark.
- Motion on the home page is copied frame by frame from `title-card-jergusino.mp4`: a short Ink hold, the letters rise one by one from the baseline, then the bar falls from the very top of the screen, overshoots 10% and settles. *i am* writes on beside the letters (the one addition). Hard cuts and masks, no fades. It is switched off for visitors who prefer reduced motion.
- A click on a poster on its page opens the viewer: full size on Ink, ← → or swipe to flip through all posters, Esc to close. On a poster page ← → also go to the previous / next poster, and on a poster wall the arrow keys move between posters. A "preskočiť na obsah" link appears on the first Tab.
- The Projects page has a category selector, a subject selector (téma), sorting (newest, oldest, A–Z) and search, all plain text in Cream with the active choice in Yellow. The choice is kept in the address, e.g. `/projects/?tema=film&zoradit=az&q=club`. Links and filters change colour on hover and focus, never opacity. On a poster, hover drops the Yellow bar of the logo onto its top edge (0.2 s, soft landing; it leaves in 0.1 s).

## Fonts and licences, please read

- **Borisna** is a *demo* font by Koplexs Studio: free for private, non-profit use only. The site currently uses it as a personal site. If the portfolio is used to get paid work, buy the commercial licence (koplexsstudio@gmail.com) before that.
- **Slithen** came without a licence file. Check its terms where you got it.
- **Edwardian Script ITC** is © International Typeface Corporation / Microsoft. The file allows editable embedding, but it is a commercial font, so check that your licence covers web use.
- The fonts in `assets/fonts/` were extended with the Slovak letters Č Ľ Ť Ň Ď Ž ľ ť ď by copying carons and apostrophes from existing letters. `tools/build_assets.py` regenerates them from the original files. Check Slovak text with `ĺ`, `ŕ`, `Ĺ`, `Ŕ`: those four letters are not in these fonts.

## Files

```
_config.yml          site settings
_data/types.yml      project types
_projects/           one Markdown file per project
_templates/          project template (not published)
_layouts/ _includes/ page templates, wordmark, header
assets/              css, js, fonts, images
tools/               new-project.sh, twotone.py, build_assets.py (fonts), trace_card.py (wordmark)
```
