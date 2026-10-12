# Changelog

## 1.0.1 (2026-10-13)

Security, privacy and robustness fixes after an independent review. No change to what the export contains.

- Chats are never exported from a shared project whose owner has not shared them, regardless of what the server returns.
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

## 1.0.0 (2026-10-13)

First release.

- Export every chat from every Claude Design project to Markdown, one folder per project, in a single ZIP.
- Transcripts include Claude's questions with their options and your answers, compact lists of the steps Claude took, files created or edited per turn, mid-turn messages, errors and todo lists.
- Claude's internal thinking is left out of the Markdown.
- Optional raw JSON of each project for re-processing.
- A ready-to-paste prompt per project for continuing the work in Claude.
- No browser permissions, no network calls beyond Claude Design itself, no third-party code.
