export default function ListLoading() {
  return (
    <main className="min-h-screen bg-[#faf7f2] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="h-10 w-3/4 rounded bg-[#1c1c1e]/10 animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-[#1c1c1e]/5 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
