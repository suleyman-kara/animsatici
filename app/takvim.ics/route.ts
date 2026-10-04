import { buildIcs } from "@/lib/calendar";
import { getEvents } from "@/lib/data";
import { classify } from "@/lib/dates";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET() {
  // Son 1 ayda biten etkinlikler de kalır ki takvimlerden aniden silinmesinler.
  const events = (await getEvents()).filter((e) => classify(e, Date.now() - MONTH_MS) !== "past");
  return new Response(buildIcs(events, { siteUrl: SITE_URL, name: SITE_NAME }), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="kampusradar.ics"' },
  });
}
