"use client";
import { useEffect } from "react";
export function Runtime({ analytics }: { analytics: boolean }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const send = (event: string) => {
      if (analytics)
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event }),
          keepalive: true,
        }).catch(() => {});
    };
    send("card_view");
    const listener = (e: MouseEvent) => {
      const target =
        e.target instanceof Element
          ? e.target.closest<HTMLElement>("[data-event]")
          : null;
      if (target?.dataset.event) send(target.dataset.event);
    };
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, [analytics]);
  return null;
}
