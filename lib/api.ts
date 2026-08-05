import { NextResponse } from "next/server";
import { logRequest } from "./request-log";
import type { UpdateAction } from "./types";

/** Permissive CORS so an external agent can call these routes from anywhere. */
export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function fail(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: message, ...extra },
    { status, headers: CORS_HEADERS },
  );
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function parseAction(value: unknown): UpdateAction | undefined {
  return value === "add" || value === "set" ? value : undefined;
}

/**
 * Accepts numbers or numeric strings, since agents frequently send `"100"`.
 * Rejects NaN/Infinity so they can't corrupt a balance.
 */
export function parseAmount(value: unknown): number | undefined {
  const n = typeof value === "string" ? Number(value.trim()) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | undefined> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Wraps a mutation handler so every attempt lands in the request log —
 * including rejected ones, which are the interesting case when an agent's
 * calls aren't taking effect.
 *
 * Reads the body here and hands the text to the handler, because a Request
 * body can only be consumed once.
 */
export function withLogging(
  route: string,
  handler: (body: Record<string, unknown> | undefined, raw: string) => Promise<Response>,
) {
  return async function POST(request: Request): Promise<Response> {
    const raw = await request.text();
    let parsed: Record<string, unknown> | undefined;
    try {
      const json = JSON.parse(raw);
      if (json && typeof json === "object") parsed = json as Record<string, unknown>;
    } catch {
      // Left undefined; the handler turns this into a 400.
    }

    const response = await handler(parsed, raw);

    // Read a clone so the caller still gets an unconsumed body.
    let result = "";
    try {
      const data = (await response.clone().json()) as Record<string, unknown>;
      result = data.ok
        ? `previous=${data.previous} delta=${data.delta} balance=${data.balance}`
        : String(data.error ?? "");
    } catch {
      result = "(unreadable response)";
    }

    await logRequest({
      at: new Date().toISOString(),
      route,
      status: response.status,
      userAgent: request.headers.get("user-agent")?.slice(0, 120) ?? "(none)",
      body: raw.slice(0, 400),
      result,
    });

    return response;
  };
}
