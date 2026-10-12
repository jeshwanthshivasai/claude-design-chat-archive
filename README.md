# Chat Archive for Claude Design

The standalone Claude Design site (claude.ai/design) closes on **14 December 2026**. Your projects can be downloaded, but **your chats are not migrated** and are deleted after the closure. This Chrome extension saves every conversation from every project in one click, as readable Markdown plus the complete raw data.

Unofficial. Not made by or affiliated with Anthropic.

<p>
  <img src="docs/panel.png" alt="The Chat archive panel open over Claude Design, listing six projects with checkboxes and an Export 5 projects button" width="367">
  <img src="docs/exporting.png" alt="The same panel mid-export: two projects done with their chat counts, a progress bar, and Saving Trail running app (3 of 5)" width="367">
</p>

**[Download the latest release](https://github.com/jeshwanthshivasai/claude-design-chat-archive/releases/latest)** · [Install steps](#install-about-one-minute) · [Privacy](#privacy)

## What you get

One ZIP with a folder per project:

```
claude-design-chats-2026-10-12/
  README.md                         every project, with chat and message counts
  GenbaNEXT Website/
    _index.md                       the project's chats in order, with dates
    01 Homepage redesign (2026-05-04).md
    02 Mobile pass (2026-05-09).md
    _resume-in-claude.md            how to continue this project in Claude, with a ready prompt
    _raw/project-data.json          the complete original data (optional)
```

Each transcript keeps the full back-and-forth in order:

- your messages and Claude's replies, with timestamps
- the questions Claude asked you, with their options, and the answers you picked. Much of the steering usually happens here.
- the steps Claude took in each turn (files written, edits, checks) as compact lists, plus which files each turn created or edited
- messages you sent mid-turn, errors, and the todo list at the time of export

Claude's internal thinking is left out of the Markdown.

Your design files are **not** included. Download those per project from Claude Design: Share → Project HTML → Project archive.

## Install (about one minute)

1. Download `claude-design-chat-archive-v1.0.0.zip` from the [latest release](https://github.com/jeshwanthshivasai/claude-design-chat-archive/releases/latest) and unzip it somewhere you'll keep it. Chrome loads the extension from that folder, so don't delete it afterwards.
2. In Chrome, open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder (the one containing `manifest.json`).

## Use

1. Open [claude.ai/design](https://claude.ai/design) while signed in.
2. Click the **Export chats** tab on the right edge of the page.
3. Untick any projects you don't want, then click **Export**.

A project with a few chats takes about a second; very long chats take a little longer. You can keep working in other tabs while it runs.

## Privacy

- Runs entirely in your browser, using your existing Claude sign-in.
- Requests no browser permissions. It only runs on `claude.ai/design` pages.
- Sends nothing anywhere: no servers, no analytics, no third-party code. The ZIP is built in the page and saved by your browser.
- Read-only. It only calls the same "list projects" and "get project" requests the Claude Design page itself makes when you open it.

The code is small enough to read in a few minutes: `src/exporter.js` (fetching), `src/render.js` (Markdown), `src/zip.js` (the ZIP file), `src/panel.js` (the panel).

## Team and Enterprise accounts

Projects teammates shared in your organisation are listed but unticked by default. You can export their chats only if the owner has shared chats with you; otherwise that project's folder says so.

## If something goes wrong

- **"Not signed in, or no access"**: reload Claude Design, check you're signed in, and try again.
- **A project failed**: its folder in the ZIP contains `_error.txt` with the reason. The rest of the export still completes.
- **No tab on the page**: reload the page after installing. The extension doesn't run on the main Claude site, only on claude.ai/design.

This relies on Claude Design's internal web requests, which are undocumented and may change. It is meant as a one-off rescue tool before the closure date.

## License

MIT
