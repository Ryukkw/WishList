import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../[...nextauth]/route";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
    } catch (err) {
      console.error("Register: backend unreachable", err);
      return NextResponse.json(
        { error: "Backend unreachable. Is the API running on " + API_URL + "?" },
        { status: 503 }
      );
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = Array.isArray((data as { detail?: unknown }).detail)
        ? (data as { detail: { msg?: string }[] }).detail.map((d) => d.msg || "").join(", ")
        : (data as { detail?: string }).detail || "Registration failed";
      return NextResponse.json({ error: message }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Register error", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
