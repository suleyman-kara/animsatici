import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createKampusServer } from "@/lib/mcp/server";
import { getActiveSources } from "@/lib/sources";

// Uzak MCP sunucusu (Streamable HTTP, durumsuz). Her istek için yeni sunucu ve transport oluşturulur.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, mcp-session-id, mcp-protocol-version, last-event-id",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

async function handle(request: Request): Promise<Response> {
  const server = createKampusServer({ sources: await getActiveSources(), githubToken: process.env.GITHUB_TOKEN });
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
