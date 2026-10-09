"use client";

import { useState } from "react";
import { track } from "@/lib/track";

export function CopyButton({ text, event, label = "Kopyala" }: { text: string; event: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track(event);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // panoya erişim yoksa kullanıcı metni elle seçebilir
    }
  }
  return (
    <button type="button" onClick={copy}
      className="pressable shrink-0 rounded-lg border-2 border-border bg-pop-yellow px-3 py-1 font-display text-sm font-bold text-pop-fg shadow-pop-sm">
      {copied ? "Kopyalandı ✓" : label}
    </button>
  );
}
