"use client";

import { useState, useSyncExternalStore } from "react";
import { track } from "@/lib/track";

const noop = () => () => {};

export function SubscribeButtons({ siteUrl }: { siteUrl: string }) {
  // Tarayıcıda gerçek adres kullanılır; yapılandırılmış site adresi yanlış olsa bile abonelik çalışsın.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => siteUrl);
  const [copied, setCopied] = useState(false);
  const icsUrl = `${origin}/takvim.ics`;
  const webcal = icsUrl.replace(/^https?:/, "webcal:");
  // Google'ın "cid" parametresi harici takvimler için webcal:// adresi bekler; https:// verilince "URL hatası" veriyor.
  const google = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      track("ics-abone", { via: "kopyala" });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Takvim adresini kopyalayın:", icsUrl);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 text-sm">
        <a href={google} target="_blank" rel="noopener" onClick={() => track("ics-abone", { via: "google" })}
          className="pressable rounded-xl border-2 border-border bg-pop-yellow px-3.5 py-2 font-display font-bold text-pop-fg shadow-pop-sm">
          📆 Google Takvim&apos;e abone ol
        </a>
        <a href={webcal} onClick={() => track("ics-abone", { via: "webcal" })}
          className="pressable rounded-xl border-2 border-border bg-surface px-3.5 py-2 font-display font-bold text-fg shadow-pop-sm">
          Apple / Outlook
        </a>
        <button type="button" onClick={copy}
          className="pressable rounded-xl border-2 border-border bg-surface px-3.5 py-2 font-display font-bold text-fg shadow-pop-sm">
          {copied ? "Kopyalandı ✓" : "Takvim adresini kopyala"}
        </button>
      </div>
      <p className="max-w-2xl text-xs opacity-80">
        Google Takvim abone olunan takvimleri birkaç saatte bir günceller; ilk etkinliklerin görünmesi biraz sürebilir.
        Buton çalışmazsa adresi kopyalayıp Google Takvim&apos;de &quot;Diğer takvimler → + → URL ile&quot; seçeneğine yapıştırın.
      </p>
    </div>
  );
}
