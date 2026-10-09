// Küçük bir robots.txt ayrıştırıcısı (RFC 9309): grup seçimi, Allow/Disallow, `*` ve `$` desenleri.

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
}

export interface Robots {
  groups: Group[];
}

export function parseRobots(text: string): Robots {
  const groups: Group[] = [];
  let current: Group | undefined;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      // Boş Disallow "her şeye izin" demektir; kural eklemeye gerek yok.
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return { groups };
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regex}${anchored ? "$" : ""}`).test(path);
}

/** `userAgent` adlı tarayıcının `path`'i (sorgu dizesi dahil) okumasına izin var mı? */
export function isAllowed(robots: Robots, userAgent: string, path: string): boolean {
  const ua = userAgent.toLowerCase();
  let groups = robots.groups.filter((g) => g.agents.includes(ua));
  if (!groups.length) groups = robots.groups.filter((g) => g.agents.includes("*"));

  let best: Rule | undefined;
  for (const rule of groups.flatMap((g) => g.rules)) {
    if (!matches(rule.pattern, path)) continue;
    const longer = !best || rule.pattern.length > best.pattern.length;
    const tieAllow = best && rule.pattern.length === best.pattern.length && rule.allow;
    if (longer || tieAllow) best = rule;
  }
  return best ? best.allow : true;
}
