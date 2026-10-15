# Privacy policy: Design Chat Archive

Last updated: 15 October 2026 (version 2.0)

Design Chat Archive is a browser extension that saves the chats from your Claude Design projects to a ZIP file on your computer. This page lists everything it does with your data.

## What it reads

It runs only on Claude Design pages (`claude.ai/design`). From the Claude Design site you are signed in to, it reads:

- **Your project list.** This includes names, dates, who owns each project, and projects shared with you in your organisation. It reads the list when you open the extension's side panel on a Claude Design tab, so the panel can show your projects. It also reads it when you click **Save chats** in a project, to check that project's sharing.
- **Each project's data**, but only for the projects you choose and only when you click **Archive** or **Save chats**. This data contains the chats: your messages, Claude's replies, the questions Claude asked and your answers, the steps Claude took, uploaded text, and any file paths you gave Claude.

It reads nothing else. That means no other sites, no browsing history, no cookies, no passwords and no files on your computer.

## What it does with it

Everything below happens inside your browser, and only when you start an archive.

- **Chat transcripts.** It turns the chats into Markdown files.
- **Extras**, if you leave them switched on. It works these out from the chats it just read:
  - **A case study page** for each project: the first message, the questions and answers, the moments the wording suggests a change of direction, and the files that were made.
  - **An offline reader page** that shows and searches every chat.
  - **A prompt library** of your own prompts.
  - **A summary card image** ("Wrapped") with counts, such as messages, decisions answered and files made, plus your busiest day and hour. It never shows project names. Your most-used words appear on the card only if you switch that on in the panel, and the copy saved in the ZIP never includes them.
  - In projects where several people wrote, only messages from your own account count as yours.
- **Raw data (optional, off by default).** It can add each project's raw data as JSON.
- **The download.** It packs everything into one ZIP in your browser's memory and hands it to your browser as a download.

## What leaves your browser

Nothing. The extension makes network requests only to `claude.ai`, the site you are already using, to fetch your own projects. It has no server of its own and makes no other connections. It contains no analytics, crash reporting, advertising or third-party code, and it loads no remote fonts, images or scripts.

Because the download starts from your Claude Design tab, that page (claude.ai) can see that a download happened. This is the same site the data came from.

## What it stores

The side panel remembers your option choices: six on/off switches, such as whether to include case studies. They are kept in the extension's local storage in this browser. It stores no project names, chat text, IDs or history. Once the ZIP is downloaded and the tab is closed, nothing else remains.

## Permissions

- **`sidePanel`**: shows the extension in Chrome's side panel when you click its toolbar icon.
- **A script on `claude.ai/design` pages**: reads your projects as described above and adds the **Save chats** button to each project's toolbar. Chrome describes this as being able to "read and change your data on claude.ai".

## Shared projects

In Team and Enterprise organisations, projects that teammates shared with you are listed but unticked. A project's chats are saved only in one of two cases:

- the site says the project is yours, or
- the site states that its owner shared the chats with you.

If neither is true, none of that project's chats or raw data are saved.

## Your archive

The ZIP is yours and stays on your computer. It can contain:

- confidential material from your chats
- uploaded text
- local file paths
- the display names of people who wrote in shared chats
- in the raw JSON: file contents, unsent drafts and internal IDs

Keep it somewhere private.

## Changes

If this policy changes, the change will be listed in the repository's changelog and the date above will be updated.

## Contact

Open an issue at https://github.com/jeshwanthshivasai/claude-design-chat-archive/issues.

Design Chat Archive is an independent, unofficial tool. It is not made by, endorsed by, or affiliated with Anthropic.
