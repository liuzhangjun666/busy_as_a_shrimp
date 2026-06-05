export default function ResourceReviewLoading() {
  return (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              height: "28px",
              width: "120px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.06)",
              animation: "shimmer 1.4s infinite"
            }}
          />
          <div
            style={{
              height: "16px",
              width: "220px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.04)",
              animation: "shimmer 1.4s infinite 0.1s"
            }}
          />
        </div>
        <div
          style={{
            height: "28px",
            width: "72px",
            borderRadius: "20px",
            background: "rgba(99,102,241,0.15)",
            animation: "shimmer 1.4s infinite 0.15s"
          }}
        />
      </div>

      <div
        style={{
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "1px",
            padding: "14px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.05)"
          }}
        >
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "14px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.08)",
                animation: `shimmer 1.4s infinite ${i * 0.05}s`
              }}
            />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, row) => (
          <div
            key={row}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "1px",
              padding: "14px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.03)"
            }}
          >
            {Array.from({ length: 7 }).map((_, col) => (
              <div
                key={col}
                style={{
                  height: "13px",
                  borderRadius: "4px",
                  background: "rgba(255,255,255,0.04)",
                  animation: `shimmer 1.4s infinite ${(row * 7 + col) * 0.03}s`
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <style>{`@keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );
}
