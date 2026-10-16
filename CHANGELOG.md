# Changelog

## 2.0.0 (2026-10-15)

A new home, and four new things in the archive.

- **New icon:** a chat bubble going into a manila folder on a navy tile. It reads clearly at 16 px on light and dark toolbars. The store images are built from the real extension by `node store/make-assets.js`.
- **Side panel.** Clicking the toolbar icon opens Chrome's side panel instead of a tab on the page. It shows:
  - a ruler counting down the days to 14 Dec
  - your projects, with search
  - a choice of what goes in the archive
  - live progress per project and a Stop button
  - a finished screen with the ZIP's name and size

  The right-edge "Export chats" tab is gone.
- **Save chats button.** Every project's toolbar gets a **Save chats** button next to Share, which saves just that project.
- **Case study per project** (`case-study.html`). A first draft of how the design took shape:
  - the brief
  - Claude's questions and your answers
  - the moments you changed direction
  - the files that came out of it
  - the prompts that worked
- **Offline reader** (`index.html`). Every chat in one page, searchable, with no internet needed.
- **Prompt library** (`prompts.md`, and in the reader). Your prompts, with the ones that led to work you kept marked.
- **Wrapped card** (`wrapped.png`). Your Claude Design in numbers, to share. It never shows project names. Your most-used words appear only if you turn them on in the panel.
- **Sharing rule, tightened.** Chats are saved only when the server says the project is yours or says its owner shared the chats with you. A project the server marks as not yours is treated as shared, whichever list it came from.
- **Shared chats.** Where several people wrote in a chat, only your own messages count as yours in the case study, prompt library and card.
- **Raw data.** The raw JSON is now off by default.
- **Extras never cost you the transcripts.** If an extra can't be made, the archive still downloads and `_extras-error.txt` says why. Archives too large for one reader page skip `index.html`.
- **No more empty ZIPs.** If none of the chosen projects has chats you can save, nothing is downloaded and the panel says why.
- **New permission: `sidePanel`.** It shows no install warning. The panel remembers your option switches in this browser; nothing else is stored.
- **Security fixes from an independent review:**
  - The reader no longer freezes on file trees or tables without a closing pipe.
  - Hidden characters are stripped from prompts.
  - The Save button's markup can't be influenced by the page and only responds to real clicks.
  - Word counts can't collide with built-in names.
- **Tests.** There are 30 unit tests, plus an end-to-end run of the real extension in Chromium (`test/e2e.js`).

## 1.0.2 (2026-10-13)

- Clicking the toolbar icon now opens the export panel on a Claude Design page, or opens Claude Design with the panel already open. The popup that only gave directions is gone.
- The Export chats tab is now dark with a light edge and a folder icon, so it stands out on light designs as well as dark ones, and it pulses a few times when the page loads. It sits higher on the right edge, clear of Claude Design's Tweaks panel.
- New icon and promo tile: a chat bubble being filed into a folder.
- No new permissions.

## 1.0.1 (2026-10-13)

Security, privacy and robustness fixes after an independent review. No change to what the export contains.

- Chats from a project someone else shared are exported only when the server explicitly says the owner shared them with you; a missing or false flag means none are exported, and neither is the raw data.
- A bad date in project data could put `../` into a file name inside the ZIP. File names now only ever contain a formatted date or `undated`.
- A project with no name, or a message in an unexpected shape, no longer aborts the whole export after all the downloading is done. Such a project is marked failed, its raw data is kept in `_raw/project-data.json`, and the rest of the export continues.
- Stop now ends the export at once, including mid-request and mid-wait, and the ZIP of what's finished is still produced.
- Server retry delays are capped at 30 seconds.
- An expired session (a sign-in page instead of data) is reported as such instead of as a JSON error.
- Folder names that Windows cannot create (`CON`, `AUX`, `NUL`, `COM1`…) get a leading underscore; names that differ only by case or Unicode form no longer collide on macOS and Windows; invisible and bidirectional-override characters are stripped from names; a project called `README.md` no longer collides with the archive README.
- In shared projects with more than one writer, user messages are labelled with the author's name instead of "You".
- Transcripts state the UTC offset instead of the time zone name.
- The ZIP writer refuses to write an archive that would exceed the plain ZIP limits instead of silently wrapping.
- The panel's shadow root is closed to page scripts; the API base URL is absolute.
- Regression tests: `node test/run.js`.
- Renamed to Design Chat Archive (the product name no longer leads with Anthropic's trademark), with a privacy policy (`PRIVACY.md`) and a Chrome Web Store submission kit in `store/`.

## 1.0.0 (2026-10-13)

First release.

- Export every chat from every Claude Design project to Markdown, one folder per project, in a single ZIP.
- Transcripts include Claude's questions with their options and your answers, compact lists of the steps Claude took, files created or edited per turn, mid-turn messages, errors and todo lists.
- Claude's internal thinking is left out of the Markdown.
- Optional raw JSON of each project for re-processing.
- A ready-to-paste prompt per project for continuing the work in Claude.
- No browser permissions, no network calls beyond Claude Design itself, no third-party code.
