export default function ListEditorLoading() {
  return (
    <main className="min-h-screen bg-[#faf7f2]">
      <header className="border-b border-[#1c1c1e]/8 bg-white/80 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="h-5 w-24 rounded bg-[#1c1c1e]/10 animate-pulse" />
          <div className="h-5 w-32 rounded bg-[#1c1c1e]/10 animate-pulse" />
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="h-9 w-48 rounded bg-[#1c1c1e]/10 animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-[#1c1c1e]/5 animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
