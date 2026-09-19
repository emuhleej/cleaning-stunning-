import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";
import { mergeChanges } from "./progress-store.js";

// Load the CDN SDK only after the local planner has rendered. A missing config
// or unavailable CDN must not prevent the checklist from working.
export async function createFirebaseClient() {
  if (!isFirebaseConfigured()) return null;
  const [appModule, authModule, dbModule] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
  ]);
  const app = appModule.initializeApp(firebaseConfig);
  const auth = authModule.initializeAuth(app, {
    persistence: [authModule.indexedDBLocalPersistence, authModule.browserLocalPersistence, authModule.inMemoryPersistence]
  });
  const db = dbModule.getFirestore(app);

  return {
    onAuth: (next, error) => authModule.onAuthStateChanged(auth, next, error),
    signIn: (email, password) => authModule.signInWithEmailAndPassword(auth, email, password),
    createAccount: (email, password) => authModule.createUserWithEmailAndPassword(auth, email, password),
    signOut: () => authModule.signOut(auth),
    resetPassword: (email) => authModule.sendPasswordResetEmail(auth, email),
    backendForUser(uid) {
      const reference = (id) => dbModule.doc(db, "users", uid, "homeReset", id);
      return {
        watch(id, next, error) {
          return dbModule.onSnapshot(reference(id), { includeMetadataChanges: true }, (snapshot) => {
            // Only server-confirmed snapshots count as a successful cloud load.
            if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
            next(snapshot.exists() ? snapshot.data().tasks ?? {} : {});
          }, error);
        },
        commit(id, { imports, changes }) {
          return dbModule.runTransaction(db, async (transaction) => {
            const ref = reference(id);
            const snapshot = await transaction.get(ref);
            if (snapshot.exists() && snapshot.data().version !== 1) {
              throw new Error("This saved progress needs a newer version of Home Reset.");
            }
            const remote = snapshot.data()?.tasks ?? {};
            const tasks = mergeChanges(remote, imports, changes);
            transaction.set(ref, { version: 1, tasks, updatedAt: dbModule.serverTimestamp() }, { merge: true });
          });
        }
      };
    }
  };
}

export function friendlyError(error) {
  const messages = {
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "The email or password is incorrect. Try again or reset your password.",
    "auth/wrong-password": "The email or password is incorrect. Try again or reset your password.",
    "auth/user-not-found": "The email or password is incorrect. Try again or create an account.",
    "auth/email-already-in-use": "An account already uses that email. Choose Sign in or reset your password.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/password-does-not-meet-requirements": "Choose a stronger password that meets your account’s password requirements.",
    "auth/too-many-requests": "Too many attempts. Please wait a little before trying again.",
    "auth/network-request-failed": "Couldn’t connect. Check your internet connection and try again.",
    "auth/operation-not-allowed": "Cloud sign-in isn’t ready yet. You can keep using the checklist on this device.",
    "auth/user-disabled": "This account is disabled. Cloud saving is unavailable for this account.",
    "permission-denied": "Your account couldn’t access cloud saving. Your unsent changes are kept on this device when storage is available.",
    "unavailable": "Cloud saving is temporarily unavailable. Reconnect and try again.",
    "resource-exhausted": "Cloud saving is temporarily at capacity. Please try again later."
  };
  return messages[error?.code] ?? "Couldn’t connect to cloud saving. Please try again; checkmarks can still be kept on this device.";
}
