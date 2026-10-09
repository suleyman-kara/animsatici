"use client";

import Link from "next/link";
import Script from "next/script";
import { useState, useSyncExternalStore } from "react";
import { track } from "@/lib/track";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done"; issueUrl?: string } | { kind: "error"; message: string };

const noop = () => () => {};

export function SuggestionForm({ siteKey }: { siteKey?: string }) {
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  const initialType = new URLSearchParams(search).get("tur") === "geri-bildirim" ? "feedback" : "source";
  const [chosenType, setType] = useState<"source" | "feedback" | null>(null);
  const type = chosenType ?? initialType;
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    const text = String(form.get("text") ?? "");
    const payload = type === "source" ? { type, url: String(form.get("url") ?? ""), text: text || undefined } : { type, text };
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/oneri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload,
          turnstileToken: form.get("cf-turnstile-response") || undefined,
          website: form.get("website") || undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; issueUrl?: string; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Bir hata oluştu.");
      track("oneri-gonder", { tur: type });
      setStatus({ kind: "done", issueUrl: data.issueUrl });
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
      (window as { turnstile?: { reset: () => void } }).turnstile?.reset();
    }
  }

  if (status.kind === "done") {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface shadow-pop p-6">
        <h2 className="font-display text-2xl font-extrabold">🎉 Teşekkürler!</h2>
        <p className="text-fg-muted">
          {type === "source"
            ? "Önerin alındı. Bağlantı otomatik olarak kontrol edilecek, uygunsa kaynak listesine eklenecek."
            : "Geri bildirimin alındı."}
        </p>
        {status.issueUrl && (
          <a href={status.issueUrl} target="_blank" rel="noopener" className="font-medium underline">Buradan takip edebilirsin ↗</a>
        )}
        <Link href="/kaynaklar" className="text-sm text-fg-muted underline">Kaynaklara dön</Link>
      </div>
    );
  }

  const field = "rounded-xl border-2 border-border bg-surface px-3 py-2 shadow-pop-sm";
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <div role="tablist" aria-label="Öneri türü" className="grid grid-cols-2 gap-2 font-display text-sm font-bold">
        {(
          [
            ["source", "Kaynak öner"],
            ["feedback", "Geri bildirim"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={type === value} onClick={() => setType(value)}
            className={`pressable rounded-xl border-2 border-border px-3 py-2 shadow-pop-sm ${type === value ? "bg-pop-mint text-pop-fg" : "bg-surface text-fg-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {type === "source" ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Fırsatların listelendiği sayfa</span>
            <input name="url" type="url" required inputMode="url" placeholder="https://…" maxLength={500} className={field} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Bu sayfada ne var? <span className="font-normal text-fg-muted">(isteğe bağlı)</span></span>
            <textarea name="text" maxLength={1000} rows={3} className={field}
              placeholder="Örn. &quot;Kulübümüzün hackathon ve atölye duyuruları&quot;, &quot;X şirketinin staj ilanları&quot;" />
          </label>
        </>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="font-medium">Mesajın</span>
          <textarea name="text" required minLength={10} maxLength={1000} rows={5} className={field}
            placeholder="Bir kaynak bozuk mu, MCP aracı beklediğin gibi çalışmıyor mu? Yaz." />
        </label>
      )}

      {/* Honeypot: ekran okuyucular ve insanlar için gizli */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Web sitesi <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} data-language="tr" />}

      <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
        Önerin herkese açık olarak yayınlanır. Lütfen ad, e-posta veya telefon gibi kişisel bilgi yazma.
      </p>

      {status.kind === "error" && <p role="alert" className="text-sm text-danger">{status.message}</p>}

      <button type="submit" disabled={status.kind === "sending"}
        className="self-start pressable rounded-xl border-2 border-border bg-pop-yellow px-4 py-2 font-display font-bold text-pop-fg shadow-pop-sm disabled:opacity-60">
        {status.kind === "sending" ? "Gönderiliyor…" : "Gönder 🚀"}
      </button>
    </form>
  );
}
