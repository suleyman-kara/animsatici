// Tek seferlik göç: data/catalog.json → data/sources/<id>.json
import { promises as fs } from "node:fs";
import path from "node:path";
import { readJson, writeSource } from "../lib/store";
import { Source } from "../lib/schema";

type CatalogItem = { id: string; title: string; category: string; description?: string; url: string };

const catalogPath = path.join(process.cwd(), "data", "catalog.json");
const catalog = (await readJson(catalogPath)) as { items: CatalogItem[] };

for (const item of catalog.items) {
  const source = Source.parse({
    id: item.id,
    title: item.title,
    url: item.url,
    category: item.category,
    kind: "listing",
    active: true,
    render: "static",
    notes: item.description,
  });
  await writeSource(source);
  console.log(`✓ ${source.id}`);
}

await fs.rm(catalogPath);
console.log(`${catalog.items.length} kaynak taşındı, catalog.json silindi.`);
