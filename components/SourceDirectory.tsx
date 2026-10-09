"use client";

import { useMemo, useState } from "react";
import type { Field, OpportunityType, Source } from "@/lib/schema";
import { filterSources } from "@/lib/filter";
import { FIELD_LABELS, KIND_LABELS, SCOPE_LABELS, TYPE_LABELS } from "@/lib/taxonomy";

export function SourceDirectory({ sources }: { sources: Source[] }) {
  const [field, setField] = useState<Field | "">("");
  const [type, setType] = useState<OpportunityType | "">("");
  const [city, setCity] = useState("");
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => filterSources(sources, { field: field || undefined, type: type || undefined, city: city || undefined, query: query || undefined }),
    [sources, field, type, city, query],
  );
  const cities = [...new Set(sources.map((s) => s.city).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "tr"));
  const control = "rounded-xl border-2 border-border bg-surface px-3 py-2 shadow-pop-sm";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Alan
          <select value={field} onChange={(e) => setField(e.target.value as Field | "")} className={control}>
            <option value="">Hepsi</option>
            {Object.entries(FIELD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Tür
          <select value={type} onChange={(e) => setType(e.target.value as OpportunityType | "")} className={control}>
            <option value="">Hepsi</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Şehir
          <input value={city} onChange={(e) => setCity(e.target.value)} list="sehirler" placeholder="Tümü" className={control} />
          <datalist id="sehirler">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Ara
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Ör. teknofest" className={control} />
        </label>
      </div>

      <p className="text-sm text-fg-muted" aria-live="polite">{visible.length} kaynak</p>

      <ul className="grid gap-3 md:grid-cols-2">
        {visible.map((s) => (
          <li key={s.id} className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-surface p-4 shadow-pop">
            <div className="flex items-start justify-between gap-3">
              <a href={s.url} target="_blank" rel="noopener" className="font-semibold hover:underline">{s.title}</a>
              {!s.aiFetch && (
                <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn" title={s.aiFetchNote}>
                  Yalnızca link
                </span>
              )}
            </div>
            <p className="text-sm text-fg-muted">{s.description}</p>
            <p className="flex flex-wrap gap-1.5 text-xs">
              {s.types.map((t) => (
                <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 font-semibold text-accent">{TYPE_LABELS[t]}</span>
              ))}
            </p>
            <p className="text-xs text-fg-muted">
              {s.fields.map((f) => FIELD_LABELS[f]).join(", ")} · {s.city ? `${s.city}${s.university ? ` · ${s.university}` : ""}` : SCOPE_LABELS[s.scope]} ·{" "}
              {KIND_LABELS[s.kind]}
              {s.organizer ? ` · ${s.organizer}` : ""}
            </p>
            {!s.aiFetch && s.aiFetchNote && <p className="text-xs text-warn">{s.aiFetchNote}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
