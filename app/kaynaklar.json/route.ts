import { getActiveSources } from "@/lib/sources";

// Kaynak listesinin tamamı, herkesin kullanabileceği JSON olarak (build zamanında üretilir).

export const dynamic = "force-static";

export async function GET() {
  return Response.json(await getActiveSources(), {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
