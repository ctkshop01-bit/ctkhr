export async function registerServiceWorker() {
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) {
    return;
  }

  const { registerSW } = await import("virtual:pwa-register");
  registerSW({
    immediate: true,
  });
}
