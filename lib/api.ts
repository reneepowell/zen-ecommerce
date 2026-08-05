import { NextResponse } from "next/server";
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
