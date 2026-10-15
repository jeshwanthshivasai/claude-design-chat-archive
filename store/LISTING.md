# Chrome Web Store submission kit (2.0.x)

Everything the dashboard asks for, ready to paste.

**Files in this folder:**
- `screenshot-1.png` to `screenshot-5.png` (1280×800)
- `promo-tile-440x280.png` (small promo tile, required; no text, as the store asks)
- `marquee-1400x560.png` (optional marquee; needed only to be featured)
- `store-icon-128x128.png` (the same art as `icons/icon128.png`)

All of them are built from the real extension by `node store/make-assets.js`.

**The package to upload** is built by `store/build.sh` as `design-chat-archive-<version>.zip`. It contains extension files only.

## Store listing

**Name** (from the manifest): Design Chat Archive

**Summary** (from the manifest, 130 of 132 characters): Unofficial. Saves your Claude Design chats before 14 Dec 2026, plus case studies and a search reader. Nothing leaves your browser.

**Category:** Art & Design (or Workflow & Planning)

**Language:** English

**Screenshots, in order:**
1. Save every Claude Design chat before 14 Dec (the side panel next to a project).
2. Every project, drafted as a case study.
3. Search every chat, even offline (the reader).
4. Or save one project from its toolbar (the Save chats button and its notice).
5. Your Claude Design, in numbers (the Wrapped card, with sample numbers).

**Detailed description** (plain text; the store doesn't render Markdown):

```
The standalone Claude Design site (claude.ai/design) closes on 14 December 2026. Your project files can be downloaded, but your chats are not migrated and are deleted after the closure. This extension saves every conversation, and turns them into things a designer can use.

WHAT YOU GET, IN ONE ZIP
• Chat transcripts: every message, every question Claude asked and the answer you picked, the steps Claude took and the files it made, as readable Markdown.
• A case study for each project: a first draft of how the design took shape. Your brief, the decisions, the moments you changed direction, what came out of it and the prompts that worked. Plain HTML you can edit into a portfolio piece.
• An offline reader: one page that shows and searches every chat, no internet needed.
• A prompt library: your prompts, with the ones that led to work you kept marked, ready to copy back into Claude.
• A Wrapped card: your Claude Design in numbers, as an image to share. It never shows project names.
• A ready prompt for continuing each project in Claude.

HOW TO USE IT
Open claude.ai/design while signed in and click the extension's icon. The side panel lists your projects and counts down the days to the closure. Pick projects and extras, click Archive, and one ZIP lands in your Downloads. Inside a project, the Save chats button next to Share saves just that one.

PRIVACY
Runs entirely in your browser using your existing Claude sign-in. Its only network requests go to claude.ai, the site you're already on. No servers, no analytics, no third-party code. It remembers only your option switches. It never sends a message, edits a project or changes a setting. Full policy: https://github.com/jeshwanthshivasai/claude-design-chat-archive/blob/main/PRIVACY.md

In Team and Enterprise organisations, a shared project's chats are saved only when the site states the owner shared them with you.

Your design files are not included; download those from Claude Design (Share → Project HTML → Project archive).

Open source (MIT): https://github.com/jeshwanthshivasai/claude-design-chat-archive

Unofficial. Not made by, endorsed by, or affiliated with Anthropic. It relies on Claude Design's internal requests, which may change without notice; it is meant as a rescue tool before the closure date.
```

**Official URL / homepage:** https://github.com/jeshwanthshivasai/claude-design-chat-archive

**Support URL:** https://github.com/jeshwanthshivasai/claude-design-chat-archive/issues

## Privacy practices tab

**Single purpose description:**
Save the chats from the user's own Claude Design projects to a ZIP file on their computer. The ZIP holds readable transcripts and documents made from those chats (a case study per project, an offline reader, a prompt library and a summary card).

**Permission justification, sidePanel:**
Shows the extension's interface in Chrome's side panel when the user clicks the toolbar icon: the project list, the archive options, progress and the result.

**Permission justification, host access to claude.ai (from the content script):**
The content script runs only on claude.ai/design pages. It does two things:
- When the side panel is open, or when the user clicks Archive or Save chats, it requests the user's own project list and project data from the site's own API. It uses the session the user is already signed in with.
- It adds a "Save chats" button to each project's toolbar.

It makes no requests to any other site.

**Are you using remote code?** No. All code is in the package.

**Data usage: which user data does the extension handle?**
Tick *Personal communications* and *Website content*.

Reason: it reads the user's own chat messages from the Claude Design page they are on and writes them, plus documents derived from them, into a local file. Nothing is transmitted anywhere. Google's policy still asks for this to be declared when data is processed locally. The only thing stored is the panel's option switches, in the extension's local storage.

**Certifications:** tick all three.
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/jeshwanthshivasai/claude-design-chat-archive/blob/main/PRIVACY.md

## Distribution tab

Visibility: Public. Regions: all. Price: free.

## Updating from 1.0.x

1. Upload the new package on the **Package** tab.
2. Replace the screenshots with the five above.
3. Paste the new detailed description.
4. On **Privacy practices**:
   - add the sidePanel justification
   - update the single-purpose text and the host-access justification
5. Submit for review.

The `sidePanel` permission adds no install warning, so existing users are not asked to re-approve.

## If the review rejects it

The two likely reasons, and the fix for each:

- **Trademark or impersonation** (the name or listing suggests Anthropic made it): the name avoids leading with "Claude", and the summary starts with "Unofficial". If asked, add "(unofficial)" to the name.
- **Insufficient data disclosure:** check that *Personal communications* and *Website content* are ticked and that the privacy policy URL is present.
