import { Source } from "@/lib/schema";

export function makeSource(overrides: Partial<Source> = {}): Source {
  return Source.parse({
    id: "ornek-kaynak",
    title: "Örnek Kaynak",
    url: "https://example.com/etkinlikler",
    description: "Örnek açıklama.",
    fields: ["software"],
    types: ["hackathon"],
    scope: "national",
    kind: "organizer",
    lang: "tr",
    aiFetch: true,
    needsJs: false,
    active: true,
    ...overrides,
  });
}

/** URL'ye göre sabit yanıt döndüren sahte fetch. Eşleşmeyen istekler hata fırlatır. */
export function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input);
    const route = routes[url];
    if (!route) throw new Error(`beklenmeyen istek: ${url}`);
    return route();
  }) as typeof fetch;
}
