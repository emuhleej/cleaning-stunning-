import { isFirebaseConfigured } from "./firebase-config.js";
import { createFirebaseClient, friendlyError } from "./firebase-client.js";

export function setupCloudControls(store) {
  const $ = (selector) => document.querySelector(selector);
  const form = $("#account-form");
  const email = $("#account-email");
  const password = $("#account-password");
  let client;
  let user;
  let ready = false;
  let loading = false;
  let loadError = "";
  let busy = false;
  let mode = "signin";

  const message = (text) => { $("#account-message").textContent = text; };
  const setBusy = (value) => {
    busy = value;
    form.querySelectorAll("button, input").forEach((element) => { element.disabled = value; });
    $("#sign-out").disabled = value;
  };

  function render() {
    const configured = isFirebaseConfigured();
    const status = store.status();
    let text = {
      local: "Saved on this device",
      connecting: "Connecting to your saved progress…",
      saving: "Saving to your account…",
      offline: "Offline — changes will sync when connected",
      error: "Cloud saving paused — retry when connected",
      synced: "Saved to your account"
    }[status];
    if (!configured) text = "Saved on this device · Cloud saving isn’t connected yet";
    else if (loadError) text = "Cloud saving unavailable · Changes stay on this device";
    else if (!ready) text = "Saved on this device · Connecting to your account…";
    if (!store.storageOK) text = status === "synced"
      ? "Saved to your account · Device storage unavailable"
      : "Device storage unavailable — unsaved checkmarks may be lost if this page closes";
    $("#save-status").textContent = text;
    $("#save-note").dataset.state = !store.storageOK ? "error" : status;
    $("#cloud-unconfigured").hidden = configured;
    $("#account-details").hidden = !configured || !ready || Boolean(user);
    $("#signed-in-controls").hidden = !user;
    $("#account-identity").textContent = user ? `Signed in as ${user.email}` : "";
    $("#retry-sync").hidden = !configured || loading || (!loadError && status !== "error");
    $("#sync-error").textContent = loadError || (store.failure ? friendlyError(store.failure) : "");
    $("#sync-error").hidden = !$("#sync-error").textContent;
    $("#pending-note").hidden = !user || !store.hasPending();
  }

  $("#account-mode").addEventListener("click", () => {
    mode = mode === "signin" ? "create" : "signin";
    $("#account-submit").textContent = mode === "signin" ? "Sign in" : "Create account";
    $("#account-mode").textContent = mode === "signin" ? "Create an account" : "I already have an account";
    password.autocomplete = mode === "signin" ? "current-password" : "new-password";
    password.minLength = mode === "signin" ? 1 : 6;
    $("#password-help").hidden = mode === "signin";
    message("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !client || !form.reportValidity()) return;
    setBusy(true);
    message(mode === "signin" ? "Signing in…" : "Creating your account…");
    try {
      await client[mode === "signin" ? "signIn" : "createAccount"](email.value.trim(), password.value);
      password.value = "";
      message("");
      $("#account-details").open = false;
    } catch (error) {
      password.value = "";
      message(friendlyError(error));
    } finally { setBusy(false); }
  });

  $("#reset-password").addEventListener("click", async () => {
    if (busy || !client || !email.reportValidity()) return;
    setBusy(true);
    try {
      await client.resetPassword(email.value.trim());
      message("If an account uses that email, you’ll receive a password reset link.");
    } catch (error) { message(friendlyError(error)); }
    finally { setBusy(false); }
  });

  $("#sign-out").addEventListener("click", async () => {
    if (busy || !client) return;
    setBusy(true);
    try {
      await client.signOut();
      message("");
    } catch (error) {
      loadError = friendlyError(error);
      render();
    } finally { setBusy(false); }
  });

  async function connect() {
    if (loading || !isFirebaseConfigured()) return;
    loading = true;
    loadError = "";
    render();
    try {
      client = await createFirebaseClient();
      client.onAuth((account) => {
        user = account;
        ready = true;
        store.setUser(account?.uid ?? null);
        if (account) store.connect(client.backendForUser(account.uid));
        render();
      }, (error) => { loadError = friendlyError(error); render(); });
    } catch (error) {
      loadError = friendlyError(error);
    } finally {
      loading = false;
      render();
    }
  }

  $("#retry-sync").addEventListener("click", () => {
    if (!client) void connect();
    else {
      loadError = "";
      store.retry();
      render();
    }
  });
  window.addEventListener("online", () => {
    store.setOnline(true);
    if (!client) void connect();
  });
  window.addEventListener("offline", () => store.setOnline(false));
  store.setOnline(navigator.onLine);
  render();
  void connect();
  return { render };
}
