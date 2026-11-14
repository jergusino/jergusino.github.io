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

## Add a poster

Every poster is one file in `_plagaty/`. The easy way:

```bash
tools/new-plagat.sh "Názov plagátu"
```

It creates `_plagaty/nazov-plagatu.md` from `_templates/plagat.md`. Open it, fill it in, commit and push. The project appears as a card in the grid on the home page and on `/plagaty/`, newest first; a click opens its page. No other file needs to change.

(No Mac/Linux shell? Copy `_templates/plagat.md` into `_plagaty/` by hand and rename it.)

### Front matter

| Field | Required | What it does |
|---|---|---|
| `title` | yes | Headline of the page and the row in the list |
| `type` | yes | `plagat` or `spolupraca` (the category; new ones are added in `_data/types.yml`) |
| `date` | yes | `YYYY-MM-DD`. Sets the order and the year. **A future date hides the poster** until that day |
| `summary` | no | One sentence for link previews |
| `lead` | no | Yellow script line over the title (3 words at most, lowercase). Default: the type name |
| `youtube` | no | Video ID. Shows a link to the video on YouTube. Nothing from YouTube loads on the page; for a picture, save the thumbnail into the poster's folder and set `youtube_thumb` |
| `youtube_thumb` | no | Local image for the YouTube link (e.g. `/assets/img/plagaty/nazov/yt.jpg`). Never link the image from YouTube's servers |
| `video` / `poster` | no | Video file (MP4) shown on the poster page instead of a poster, playing muted on a loop with controls; `poster` is the frame shown before it loads. Used for client work (`type: spolupraca`) |
| `cover` / `cover_alt` | no | Main image (shown on the poster page) |
| `thumb` | no | Smaller image for the grid card (about 720 px wide). Without it the cover is used |
| `cover_raw` | no | `true` keeps the cover in its own colours (use it for finished posters and artwork) |
| `tools` | no | List, e.g. `[Remotion, Premiere]` |
| `links` | no | List of `label` + `url`, shown as arrows under the text |
| `gallery` | no | List of `src` + `alt` |
| `tags` | no | Subject words (film, hudba, auto, miesto...). The "téma" filter on /plagaty/ uses the ones listed in `_data/subjects.yml`; search also looks in them |
| `color` | no | The poster's edge colour, shown while the image loads. `python3 tools/poster_colors.py` fills it in for every poster |
| `similar` | no | Up to 6 poster addresses (`/plagaty/name/`) shown as "podobné práce" at the bottom. Without it the page shows other work of the same type |
| `placeholder` | no | `true` marks a sample poster. Delete the line (or the file) for real work |

The text under the front matter is Markdown.

### Images

Put images in `assets/img/plagaty/<poster>/`. By the brand guide, photos are **two-tone**: the site turns every image into pure Ink and Cream automatically, in the browser. Your own artwork that already uses the brand colours (a poster, a motion frame) would lose its Yellow, so mark it as raw:

```markdown
![Plagát](/assets/img/plagaty/nazov/plagat.png){: .raw}
```

`tools/twotone.py` converts a file for real if you need it elsewhere (social posts).

### New poster type

Add a block to `_data/types.yml` (`key`, `label`, `lead`). The filter on `/plagaty/` picks it up.

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
- Layout follows the carousel system: top row (logo + pill nav), one headline per section, DM Mono labels, 22/28 px panels, circle-arrow buttons, 6 px pills. Every page background is ink; yellow is only an accent or signal (asterisk, circle buttons, active filter, the poster number).
- Home hero: a canvas field of grey asterisks (script at the end of `assets/js/site.js`); the one nearest the pointer is yellow and they turn and grow around it. Headline, one yellow CTA, and a brand strip (projects with `brand: true` in their front matter; optional `brand_logo: /path.svg`, otherwise the name is set as a wordmark). Static for `prefers-reduced-motion`.
- Poster wall: hover one poster and the rest goes grey (yellow among grey), the hovered one gets a yellow circle-arrow. Project pages: number `NN / total`, headline, chips, prev/next as circle buttons.
- Motion: scroll reveal (`.rv`) and asterisks that turn on scroll (`.spin`).
- Slovak typography: non-breaking space after one-letter words (k s v z o u a i) in new copy.

## Privacy

The site loads nothing from other servers: fonts and images are self-hosted, there is no analytics and no cookies, so no cookie banner is needed. Keep it that way: don't add Google Fonts, Google Analytics, embeds or other third-party scripts (each one sends the visitor's IP address to that company, which needs consent in the EU). What the site and the newsletter do with personal data is written on `/sukromie/` (`sukromie/index.html`); update it if that changes.
