# Home Reset

Home Reset is a simple, phone-friendly cleaning planner with:

- an everyday checklist;
- five room-focused tasks from Sunday through Thursday;
- a four-week monthly cleaning rotation; and
- checkmarks that save automatically on the current device; and
- optional Firebase cloud saving across devices using the same signed-in account.

Cloud saving uses Firebase Authentication (email/password) and Cloud Firestore.
Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) to connect the Firebase project and
publish the owner-only database rules. The configuration is intentionally blank
until the actual project's web configuration is supplied; local saving still works.

Serve the folder over HTTP, for example with `python -m http.server 8081`.
No build step is required. Run `npm test` for persistence tests and `npm run check`
for JavaScript syntax checks.

The site uses the requested colors: `#00374b`, `#216278`, `#db3448`, `#ea9598`, and `#f4cbc7`.

This folder is ready to be placed at the root of the `emuhleej/cleaning-stunning-` GitHub repository. Publishing is intentionally separate from building and previewing.

