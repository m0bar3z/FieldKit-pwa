const PERSONAL_CACHES = new Set([
  "fieldkit-personal-data-v1",
  "apis",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "others",
]);

export async function resetSessionCache() {
  try {
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => PERSONAL_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
    }
    localStorage.setItem("fieldkit-session-changed", crypto.randomUUID());
  } catch (error) {
    console.warn("Unable to clear cached account data.", error);
  }
}
