/**
 * Tiny event bus so any component can open the support widget without
 * threading state through the tree. Also drives the real Zendesk widget via
 * its `zE` global when a key is configured.
 */
const OPEN_EVENT = "zen:open-support";
const OPENED_EVENT = "zen:support-opened";

export function openSupport(): void {
  if (typeof window === "undefined") return;

  // Prefer the real widget when the Zendesk snippet has loaded. The `zE` type
  // is declared alongside the widget in components/support-widget.tsx.
  const zE = window.zE;
  if (typeof zE === "function") {
    try {
      zE("messenger", "open");
      return;
    } catch {
      // Classic Web Widget uses a different API; fall through to the event.
    }
  }

  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenSupport(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** Announced whenever the support panel opens, so other panels can yield. */
export function notifySupportOpened(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPENED_EVENT));
}

export function onSupportOpened(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(OPENED_EVENT, handler);
  return () => window.removeEventListener(OPENED_EVENT, handler);
}
