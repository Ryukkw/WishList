"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui", background: "#faf7f2", color: "#1c1c1e", padding: 24, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: 8 }}>Что-то пошло не так</h1>
          <p style={{ opacity: 0.7, marginBottom: 24 }}>Попробуй обновить страницу.</p>
          <button
            onClick={reset}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#E8604A", color: "white", border: "none", cursor: "pointer", fontWeight: 500 }}
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}
