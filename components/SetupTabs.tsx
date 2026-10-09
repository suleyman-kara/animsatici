"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

export interface SetupClient {
  id: string;
  name: string;
  steps: string[];
  snippet?: string;
}

export function SetupTabs({ clients }: { clients: SetupClient[] }) {
  const [active, setActive] = useState(clients[0].id);
  const client = clients.find((c) => c.id === active) ?? clients[0];
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Yapay zeka uygulaması" className="flex flex-wrap gap-2 font-display text-sm font-bold">
        {clients.map((c) => (
          <button key={c.id} type="button" role="tab" id={`tab-${c.id}`} aria-selected={c.id === active} aria-controls="kurulum-paneli"
            onClick={() => setActive(c.id)}
            className={`pressable rounded-xl border-2 border-border px-3 py-1.5 shadow-pop-sm ${c.id === active ? "bg-pop-mint text-pop-fg" : "bg-surface text-fg-muted"}`}>
            {c.name}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="kurulum-paneli" aria-labelledby={`tab-${client.id}`}
        className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-surface p-5 shadow-pop">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-fg-muted">
          {client.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {client.snippet && (
          <div className="flex flex-col gap-2">
            <pre className="overflow-x-auto rounded-xl border-2 border-border bg-surface-muted p-3 text-sm"><code>{client.snippet}</code></pre>
            <div><CopyButton text={client.snippet} event="kurulum-kopyala" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
