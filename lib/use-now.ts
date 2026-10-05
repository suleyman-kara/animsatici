"use client";

import { useSyncExternalStore } from "react";

// Dakikalık saat "store"u: sunucuda/ilk çizimde build anı, tarayıcıda gerçek zaman.
// Site yalnızca tarama değiştiğinde derlendiği için zamana bağlı her şey tarayıcıda yeniden hesaplanır.
const MINUTE = 60_000;

function subscribeClock(onChange: () => void) {
  const id = window.setInterval(onChange, MINUTE);
  return () => window.clearInterval(id);
}

const currentMinute = () => Math.floor(Date.now() / MINUTE) * MINUTE;

export function useNow(builtAt: number): number {
  return useSyncExternalStore(subscribeClock, currentMinute, () => builtAt);
}
