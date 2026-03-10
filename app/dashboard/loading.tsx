export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <header className="border-b border-[#1c1c1e]/8 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="h-7 w-32 rounded bg-[#1c1c1e]/10 animate-pulse" />
          <div className="h-6 w-24 rounded bg-[#1c1c1e]/10 animate-pulse" />
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="h-5 w-64 rounded bg-[#1c1c1e]/10 animate-pulse mb-6" />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-28 rounded-xl bg-[#1c1c1e]/5 animate-pulse" />
          ))}
        </ul>
      </div>
    </main>
  );
}
