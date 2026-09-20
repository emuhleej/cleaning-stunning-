// Public web app configuration for GitHub Projects / House Cleaning.
// Access to saved progress is controlled by Authentication and firestore.rules.
// Never add admin credentials or a service-account key here.
export const firebaseConfig = {
  apiKey: "AIzaSyDr9bX7Moh_mf9UzuWYufSZAZ-Op3snDYA",
  authDomain: "github-projects-2b917.firebaseapp.com",
  projectId: "github-projects-2b917",
  appId: "1:546857229100:web:5cdad63cc3c9200068ea89"
};

export function isFirebaseConfigured() {
  return ["apiKey", "authDomain", "projectId", "appId"].every(
    (key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].trim().length > 0
  );
}
