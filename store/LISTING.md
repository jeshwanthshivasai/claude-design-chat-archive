# Chrome Web Store submission kit

Everything the dashboard asks for, ready to paste. Files in this folder: `screenshot-1.png`, `screenshot-2.png`, `screenshot-3.png` (1280×800), `promo-tile-440x280.png`. The package to upload is built by `store/build.sh` (`design-chat-archive-<version>.zip`, extension files only).

## Store listing

**Name** (from the manifest): Design Chat Archive

**Summary** (from the manifest, 132-character limit): Export your Claude Design chats to Markdown before the site closes on 14 Dec 2026. Unofficial; nothing leaves your browser.

**Category:** Art & Design (or Workflow & Planning, whichever the dashboard offers)

**Language:** English

**Detailed description** (plain text; the store doesn't render Markdown):

```
The standalone Claude Design site (claude.ai/design) closes on 14 December 2026. Your project files can be downloaded, but your chats are not migrated and are deleted after the closure. This extension saves every conversation from every project in one click.

WHAT YOU GET
One ZIP with a folder per project and one readable Markdown transcript per chat, in order:
• your messages and Claude's replies, with timestamps
• the questions Claude asked you, with their options, and the answers you picked
• the steps Claude took in each turn and the files it created or edited
• the todo list at the time of export
• optionally, the project's complete raw data as JSON
• a ready prompt for continuing each project in Claude

HOW TO USE IT
Open claude.ai/design while signed in, click the "Export chats" tab on the right edge of the page, untick anything you don't want, and click Export. A project with a few chats takes about a second. Stop ends the export at once and still gives you a ZIP of what finished.

PRIVACY
Runs entirely in your browser using your existing Claude sign-in. Its only network requests go to claude.ai, the site you're already on. No servers, no analytics, no third-party code, nothing stored. It never sends a message, edits a project or changes a setting. Full policy: https://github.com/jeshwanthshivasai/claude-design-chat-archive/blob/main/PRIVACY.md

Shared projects in Team and Enterprise organisations are exported only when the site states their owner shared the chats with you.

Your design files are not included; download those from Claude Design (Share → Project HTML → Project archive).

Open source (MIT): https://github.com/jeshwanthshivasai/claude-design-chat-archive

Unofficial. Not made by, endorsed by, or affiliated with Anthropic. It relies on Claude Design's internal requests, which may change without notice; it is meant as a rescue tool before the closure date.
```

**Official URL / homepage:** https://github.com/jeshwanthshivasai/claude-design-chat-archive

**Support URL:** https://github.com/jeshwanthshivasai/claude-design-chat-archive/issues

## Privacy practices tab

**Single purpose description:**
Export the chats from the user's own Claude Design projects into a ZIP of Markdown files on their computer.

**Permission justification (host access to claude.ai, from the content script):**
The extension runs only on claude.ai/design pages. It adds an "Export chats" panel to the page and, when the user clicks Export, requests the user's own project list and project data from the site's own API using the session the user is already signed in with. It makes no requests to any other site. No other permissions are requested.

**Are you using remote code?** No. All code is in the package.

**Data usage: which user data does the extension handle?**
Tick: *Personal communications* and *Website content*.
Reason: it reads the user's own chat messages from the Claude Design page they are on and writes them into a local file. Nothing is transmitted anywhere; Google's policy still asks for this to be declared when data is processed locally.

**Certifications:** tick all three.
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/jeshwanthshivasai/claude-design-chat-archive/blob/main/PRIVACY.md

## Distribution tab

Visibility: Public. Regions: all. Price: free.

## Before clicking "Submit for review"

- Developer account: registered, one-time fee paid, publisher email verified.
- Package built from the commit you mean to ship, version in `manifest.json` bumped.
- Privacy policy URL also saved in the account's settings if the dashboard asks for it there.

## If the review rejects it

The two likely reasons and the fix for each:

- **Trademark / impersonation** (the name or listing suggests Anthropic made it): the name already avoids leading with "Claude"; if asked, add "(unofficial)" to the name and resubmit.
- **Insufficient data disclosure**: make sure *Personal communications* and *Website content* are ticked and the privacy policy URL is present.

Rejections come with a reason by email; resubmission goes back into the queue, usually faster the second time.
