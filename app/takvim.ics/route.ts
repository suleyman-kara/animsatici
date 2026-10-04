import { buildIcs } from "@/lib/calendar";
import { getEvents } from "@/lib/data";
import { classify } from "@/lib/dates";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  // Son 1 aydaki kayıtlar da kalır ki abonelerin takviminden aniden silinmesinler.
  const since = Date.now() - MONTH_MS;
  const events = (await getEvents()).filter((e) => classify(e, since) !== "past");
  return new Response(buildIcs(events, { siteUrl: SITE_URL, name: SITE_NAME, since }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="kampus30.ics"' },
  });
}
