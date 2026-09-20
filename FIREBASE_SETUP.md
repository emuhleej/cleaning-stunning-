# Connect cloud saving

The app uses Firebase **Authentication + Cloud Firestore**.

Setup status (2026-09-20):
- Project: GitHub Projects (`github-projects-2b917`), Spark plan.
- Registered web app: House Cleaning. Its public configuration is committed in `firebase-config.js`.
- Email/Password Authentication: enabled.
- Authorized GitHub Pages domain: `emuhleej.github.io` added.
- Firestore: Standard edition `(default)` database created in the permanent `nam5 (United States)` location using production mode.
- Owner-only rules: published and verified in the live project.
- Live checks: Email/Password account creation succeeded; signed-out Firestore access was denied; signed-in access was allowed. The temporary test account was deleted and no test document was created.
- Website publication: pending merge of pull request #1. The setup steps below also document how to reproduce
or complete this configuration.

## 1. Choose the Firebase project

Open the [Firebase console](https://console.firebase.google.com/) and select your
project, or create one for Home Reset. Register a **Web app** in Project settings →
General → Your apps. Copy its web configuration into `firebase-config.js`, filling
in `apiKey`, `authDomain`, `projectId`, and `appId` exactly as Firebase provides them.

These web configuration values are public project identifiers. They can appear
in this public repository. Do not paste a service-account JSON file, private key,
access token, or account password into the repository.

## 2. Enable account sign-in

In Authentication → Sign-in method, enable **Email/Password**. Use the regular
password option; email-link sign-in is not used by this app. Add `emuhleej.github.io`
to Authentication → Settings → Authorized domains. If using a custom domain,
add its hostname too. For local development, add `localhost` explicitly if needed.

On the planner, choose **Save across devices → Create an account**. Use the same
email address and password when signing in on other devices. **Forgot password?**
sends Firebase's password-reset email. No password is saved by this app's code.

## 3. Create and secure the database

Create the **(default) Cloud Firestore database**, in Standard / Native mode.
Choose the region you want for this project's data. Start in **production mode**,
then replace the database rules with the contents of `firestore.rules` and publish
the rules. The rules allow each signed-in account to access only its own progress.
Do not use public or test-mode rules.

If this Firebase project already has other apps or rules, merge this app's
`/users/{userId}/homeReset/{periodId}` rule into them instead of replacing them.
Review overlapping wildcard rules: another broad `allow` rule can also grant access.

Alternatively, in a dedicated Home Reset Firebase project, deploy the checked-in
rules using the Firebase CLI:

```sh
firebase login
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Choose the real project ID explicitly. The project ID comes from the Firebase console. Only public web configuration is
committed; no admin credentials are stored in this repository. A Firebase Storage bucket and Firebase Hosting are not required; the
website can keep using GitHub Pages.

## 4. Verify, then publish the website change

1. Open the app on the browser/device with your existing checkmarks, and sign in.
2. Wait for **Saved to your account**. The first account used on this browser imports
   the existing device checkmarks. An explicit reset already saved in the cloud wins
   over an old device checkmark. The original device data is retained locally.
3. Sign into the same account on a second device. Confirm daily, weekly and monthly
   checkmarks appear there. Change different tasks on each device and verify both.
4. Reopen the app and confirm saved progress loads. Reset a section and confirm the
   reset appears on the other device.
5. With the page open, disconnect the network, change a task, then reconnect. Wait
   for **Saved to your account** before clearing browser data or changing devices.
6. Sign out and verify the app returns to its separate device checklist. A different
   account must show only that account's cloud progress.

Publish through the repository's existing GitHub Pages process after the connection
is configured and checked. `firebase.json` only configures Firestore rules and local
emulators; it does not change hosting.

## How saved progress works

- The site renders from its local cache first; a failed Firebase SDK download does
  not stop the checklist. Cloud libraries are loaded only when configuration exists.
- Account caches and unsent changes are scoped to Firebase project ID and user ID.
  Changes are written locally before a cloud request and removed from the pending
  queue only after the server acknowledges them.
- Three current-period documents are listened to under
  `users/{uid}/homeReset/{periodId}`: `daily-YYYY-MM-DD`, `weekly-YYYY-MM-DD` (Sunday),
  and `monthly-YYYY-MM`. Each stores `version`, a `tasks` map, and `updatedAt`.
- Firestore transactions merge changes to individual tasks with the latest server
  document. Different task edits coexist. If two devices change the **same task**,
  the last transaction committed by the server wins, including older offline edits
  when they reconnect. Resets explicitly save `false` for the affected task fields.
- Daily, weekly and monthly checklist rollovers follow each device's local time,
  matching the original planner. Past cloud period documents are retained; they are
  not a browsable history feature and no retention/deletion job is configured.
- The durable local outbox retries on reconnection, on a new edit, or via **Retry
  cloud saving**. A blocked request never produces a false cloud-saved indicator.
- Signing out returns to the guest checklist and retains any pending account changes
  in that account's device cache. Sign back into that account on that device to send
  them. Later guest edits stay on the device; automatic import is only for the first
  account on that browser.
- Offline editing requires the page to already be loaded. This is not an installable
  offline PWA. Clearing browser storage removes unsent changes and local credentials;
  already acknowledged cloud data is recoverable by signing back in.

## Development checks

No build step is needed. Serve this folder over HTTP (ES modules do not work by
double-clicking `index.html` with `file://`):

```sh
python -m http.server 8081
npm run check
npm test
```

The dependency-free tests cover legacy migration, offline/reload recovery, resets,
concurrent device changes, account separation, late acknowledgements, failed writes,
period boundaries, and unavailable/malformed browser storage. Live Firebase sign-in,
deployed rules, and synchronization must also be checked against the actual project
once its configuration is supplied.

To run the separate security-rules integration tests, install the optional test
dependencies and use a locally installed Firebase CLI with a supported Java runtime:

```sh
npm install --no-save firebase@12.19.0 @firebase/rules-unit-testing@5.0.2
firebase emulators:exec --only firestore --project demo-home-reset "node --test tests/firestore.rules.mjs"
```

The `demo-` project ID keeps this check in the emulator; it does not read or write
production accounts. The tests check owner access, blocked public/other-account
access, document shape, server timestamps and denied deletion.

References: [Firebase web setup](https://firebase.google.com/docs/web/alt-setup),
[password authentication](https://firebase.google.com/docs/auth/web/password-auth),
[Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions),
[security rules](https://firebase.google.com/docs/firestore/security/rules-conditions).
