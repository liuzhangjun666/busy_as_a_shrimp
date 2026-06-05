export default function DashboardLoading() {
  return (
    <div style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "20px" }}>
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
            width: "260px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.04)",
            animation: "shimmer 1.4s infinite 0.1s"
          }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))",
          gap: "16px"
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "90px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              animation: `shimmer 1.4s infinite ${i * 0.08}s`
            }}
          />
        ))}
      </div>

      <div
        style={{
          height: "120px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          animation: "shimmer 1.4s infinite 0.3s"
        }}
      />

      <style>{`@keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );
}
