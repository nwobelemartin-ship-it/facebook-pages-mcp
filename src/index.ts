import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { buildServer } from "./server.js";
import { getEnv } from "./env.js";

const env = getEnv();
const app = express();

app.disable("x-powered-by");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Root — Suga's default healthcheck probes `/`. Return 200 here so the
// container is not flagged unhealthy and restarted in a loop.
app.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    name: "facebook-pages-mcp",
    version: "1.0.3",
  });
});

// ── Health check (Suga readiness probe) ────────────────────────────────
app.get("/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    name: "facebook-pages-mcp",
    version: "1.0.3",
  });
});

// ── MCP endpoint ───────────────────────────────────────────────────────
// Stateless: a fresh McpServer + transport per request. No session map.
// This matches the current tool set (all stateless request/response) and
// avoids Supabase Edge Function timeout problems.
app.post("/mcp", async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[mcp] request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Stateless mode has no session to GET (upgrade) or DELETE (terminate).
app.get("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed in stateless mode" },
    id: null,
  });
});
app.delete("/mcp", (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed in stateless mode" },
    id: null,
  });
});

// ── Boot ───────────────────────────────────────────────────────────────
const httpServer = app.listen(env.PORT, env.HOST, () => {
  console.log(
    `facebook-pages-mcp listening on http://${env.HOST}:${env.PORT}`
  );
});

function shutdown(signal: string) {
  console.log(`[shutdown] received ${signal}`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
