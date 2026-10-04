"use client";

import Link from "next/link";
import Script from "next/script";
import { useState, useSyncExternalStore } from "react";
import { WRONG_REASONS } from "@/lib/suggestion";
import { track } from "@/lib/track";

type EventOption = { id: string; title: string };
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done"; issueUrl?: string } | { kind: "error"; message: string };

const noop = () => () => {};

export function SuggestionForm({ events, siteKey }: { events: EventOption[]; siteKey?: string }) {
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const initialType = params.get("tur") === "hata" ? "wrong" : "missing";
  const initialEvent = params.get("etkinlik") ?? "";

  const [chosenType, setType] = useState<"missing" | "wrong" | null>(null);
  const [chosenEvent, setEventId] = useState<string | null>(null);
  const type = chosenType ?? initialType;
  const eventId = chosenEvent ?? initialEvent;
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = new FormData(ev.currentTarget);
    const payload =
      type === "missing"
        ? { type, text: String(form.get("text") ?? ""), url: String(form.get("url") ?? "") }
        : { type, eventId, reason: String(form.get("reason") ?? "other"), text: String(form.get("text") ?? "") || undefined };
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
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Teşekkürler!</h2>
        <p className="text-fg-muted">Öneriniz alındı. Otomatik bir inceleme yapılacak ve sonucu kayda yazılacak.</p>
        {status.issueUrl && (
          <a href={status.issueUrl} target="_blank" rel="noopener" className="font-medium underline">Önerinizi buradan takip edebilirsiniz ↗</a>
        )}
        <Link href="/" className="text-sm text-fg-muted underline">Etkinliklere dön</Link>
      </div>
    );
  }

  const field = "rounded-lg border border-border bg-surface px-3 py-2";
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <div role="tablist" aria-label="Öneri türü" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 text-sm font-medium">
        {(
          [
            ["missing", "Eksik etkinlik"],
            ["wrong", "Hatalı etkinlik"],
          ] as const
        ).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={type === value} onClick={() => setType(value)}
            className={`rounded-lg px-3 py-2 ${type === value ? "bg-surface shadow-sm" : "text-fg-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {type === "missing" ? (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Hangi etkinlik veya sayfa eksik?</span>
            <textarea name="text" required minLength={10} maxLength={1000} rows={4} className={field}
              placeholder="Örn. &quot;ODTÜ'deki yapay zeka zirvesi&quot;, &quot;inzva kış kampı&quot; ya da etkinlikleri listeleyen bir topluluk sayfası" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Bağlantı <span className="font-normal text-fg-muted">(isteğe bağlı)</span></span>
            <input name="url" type="url" inputMode="url" placeholder="https://…" maxLength={500} className={field} />
          </label>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Etkinlik</span>
            <select required value={eventId} onChange={(e) => setEventId(e.target.value)} className={field}>
              <option value="" disabled>Etkinlik seçin</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Sorun nedir?</span>
            <select name="reason" required defaultValue="wrong-date" className={field}>
              {Object.entries(WRONG_REASONS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-medium">Not <span className="font-normal text-fg-muted">(isteğe bağlı)</span></span>
            <textarea name="text" maxLength={1000} rows={3} className={field} placeholder="Doğru tarih, kaynak linki vb." />
          </label>
        </>
      )}

      {/* Honeypot: ekran okuyucular ve insanlar için gizli */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Web sitesi <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} data-language="tr" />}

      <p className="rounded-lg bg-warn-soft p-3 text-sm text-warn">
        Öneriniz herkese açık olarak yayınlanır. Lütfen ad, e-posta veya telefon gibi kişisel bilgi yazmayın.
      </p>

      {status.kind === "error" && <p role="alert" className="text-sm text-danger">{status.message}</p>}

      <button type="submit" disabled={status.kind === "sending"}
        className="self-start rounded-lg bg-accent px-4 py-2 font-semibold text-accent-fg hover:opacity-90 disabled:opacity-60">
        {status.kind === "sending" ? "Gönderiliyor…" : "Gönder"}
      </button>
    </form>
  );
}
