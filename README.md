# Jergušino: portfolio

Static website built with [Jekyll](https://jekyllrb.com) and the new Jergušino brand: Yellow `#FFD60A`, Ink `#0E0E0E`, Paper `#F4F1EA`; Bricolage Grotesque + DM Mono; the asterisk logo. Sign-off: *Žltá medzi sivými.* The home page is a yellow surface among the ink pages. Slovak language.

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
| `type` | yes | `plagat` or `spolupraca` (the category; new ones are added in `_data/types.yml`) |
| `date` | yes | `YYYY-MM-DD`. Sets the order and the year. **A future date hides the project** until that day |
| `summary` | no | One sentence for link previews |
| `lead` | no | Yellow script line over the title (3 words at most, lowercase). Default: the type name |
| `youtube` | no | Video ID. Shows a two-tone thumbnail that links to YouTube (nothing from YouTube loads until a visitor clicks) |
| `video` / `poster` | no | Video file (MP4) shown on the project page instead of a poster, playing muted on a loop with controls; `poster` is the frame shown before it loads. Used for client work (`type: spolupraca`) |
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

- Colours `--ink`, `--paper`, `--yellow` (+ `--paper-soft`, `--ash`, `--line`) in `assets/css/main.css`. Yellow is the highlighter: one moment per view, yellow text only on Ink.
- Fonts (`assets/fonts/`, open source, SIL OFL): Bricolage Grotesque ExtraBold for headlines, Medium for text; DM Mono for small caps labels.
- Logo: `assets/img/logo-paper.svg` / `logo-ink.svg`, `_includes/asterisk.svg`, `_includes/wordmark.svg` (one path per letter), `favicon.svg`.
- Layout follows the carousel system: top row (logo + pill nav), one headline per section, DM Mono labels, 22/28 px panels, circle-arrow buttons, 6 px pills. Every page background is ink; yellow is only an accent or signal (asterisk, circle buttons, active filter, the project number).
- Home intro: the yellow asterisk pops in on ink, the headline lines rise, the button lands. Off for `prefers-reduced-motion`.
- Poster wall: hover one poster and the rest goes grey (yellow among grey), the hovered one gets a yellow circle-arrow. Project pages: number `NN / total`, headline, chips, prev/next as circle buttons.
- Motion: scroll reveal (`.rv`) and asterisks that turn on scroll (`.spin`).
- Slovak typography: non-breaking space after one-letter words (k s v z o u a i) in new copy.

## Návštevnosť (Google Analytics)

1. V Google Analytics (analytics.google.com) vytvor účet a „Web data stream“ pre `https://jergusino.com`.
2. Skopíruj Measurement ID (vyzerá ako `G-XXXXXXXXXX`).
3. Vlož ho do `_config.yml` ako `google_analytics: "G-XXXXXXXXXX"` a pushni.

Skript sa načíta len na živej stránke (nie pri lokálnom náhľade) a bez cookies, takže netreba cookie lištu.
