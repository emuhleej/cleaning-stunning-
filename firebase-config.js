// Paste the Firebase console's WEB app configuration here. These are public
// project identifiers, not admin credentials. Never add a service-account key.
// See FIREBASE_SETUP.md. Blank configuration keeps device-only saving working.
export const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: ""
};

export function isFirebaseConfigured() {
  return ["apiKey", "authDomain", "projectId", "appId"].every(
    (key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim().length > 0
  );
}
