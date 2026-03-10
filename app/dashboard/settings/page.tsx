import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "../../api/auth/[...nextauth]/auth-options";
import { SettingsClient } from "./SettingsClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin?callbackUrl=/dashboard/settings");
  const token = (session as { backend_token?: string }).backend_token;
  if (!token) redirect("/auth/signin?callbackUrl=/dashboard/settings");

  let profile: { id: number; email: string; name: string | null; avatar_url: string | null } | null = null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) profile = await res.json();
  } catch {
    // ignore
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-charcoal/8 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-coral hover:underline font-sans text-sm">
            ← Дашборд
          </Link>
          <span className="text-sm text-charcoal/60 font-sans">{session.user?.email}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-display text-2xl text-charcoal mb-6">Настройки</h1>
        <SettingsClient
          token={token}
          initialName={profile?.name ?? ""}
          initialEmail={profile?.email ?? session.user?.email ?? ""}
          initialAvatarUrl={profile?.avatar_url ?? ""}
        />
      </div>
    </main>
  );
}
