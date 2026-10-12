# Privacy policy: Design Chat Archive

Last updated: 13 October 2026

Design Chat Archive is a browser extension that exports the chats from your Claude Design projects into a ZIP file on your computer. This page says what it does with your data, in full.

## What it reads

When you click **Export**, the extension reads, from the Claude Design site you are signed in to:

- the list of your projects (names, dates, and projects shared with you in your organisation), and
- for each project you ticked, that project's data, which contains your chats: your messages, Claude's replies, the questions Claude asked and your answers, the steps Claude took, uploaded text, and any file paths you gave Claude.

It reads nothing else: no other sites, no browsing history, no cookies, no passwords, no files on your computer.

## What it does with it

It turns the chats into Markdown files, optionally includes the project's raw data as JSON, packs everything into one ZIP in your browser's memory, and hands the ZIP to your browser as a download. That is the whole purpose, and it happens only when you click Export.

## What leaves your browser

Nothing. The extension's only network requests go to `claude.ai`, the site you are already using, to fetch your own projects. It has no server of its own and makes no other connections. It contains no analytics, crash reporting, advertising, or third-party code.

## What it stores

Nothing. It keeps no settings, history, cache, or copies. Once the ZIP is downloaded and the tab is closed, nothing remains.

## Shared projects

In Team and Enterprise organisations, projects that teammates shared with you are listed but unticked. Their chats are exported only when the site states that the owner shared them with you. If it says no, or says nothing, none of that project's chats or raw data are exported.

## Your archive

The ZIP is yours and stays on your computer. It can contain confidential material from your chats, uploaded text, local file paths, the display names of people who wrote in shared chats, and, in the raw JSON, file contents, unsent drafts and internal IDs. Keep it somewhere private.

## Changes

If this policy ever changes, the change will be listed in the repository's changelog and the date above will be updated.

## Contact

Open an issue at https://github.com/jeshwanthshivasai/claude-design-chat-archive/issues.

Design Chat Archive is an independent, unofficial tool. It is not made by, endorsed by, or affiliated with Anthropic.
