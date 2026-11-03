"use client";

import { useEffect, useRef } from "react";
import { keepAlive } from "./actions";

const IDLE_MS = 10 * 60 * 1000; // RQNF-007; keep in sync with SESSION_TTL_MS
const PING_MS = 60 * 1000;
const STORAGE_KEY = "lastActivity";
const EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/** Logs out after 10 minutes without input. Activity is shared across tabs so one idle tab doesn't end an active session. */
export function IdleLogout() {
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let lastPing = Date.now();

    const lastActivity = () => Number(localStorage.getItem(STORAGE_KEY)) || Date.now();
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Date.now() - lastActivity() >= IDLE_MS) form.current?.submit();
        else schedule();
      }, IDLE_MS - (Date.now() - lastActivity()));
    };
    const onActivity = () => {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      if (Date.now() - lastPing > PING_MS) {
        lastPing = Date.now();
        void keepAlive().then((alive) => {
          if (!alive) form.current?.submit();
        });
      }
      schedule();
    };

    onActivity();
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
    };
  }, []);

  return <form ref={form} method="post" action="/logout?reason=idle" hidden />;
}
