export default function RootLoading() {
  return (
    <div
      style={{
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        animation: "fadeIn 0.1s ease"
      }}
    >
      {/* 顶部标题骨架 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            height: "28px",
            width: "160px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.06)",
            animation: "shimmer 1.4s infinite"
          }}
        />
        <div
          style={{
            height: "16px",
            width: "280px",
            borderRadius: "6px",
            background: "rgba(255,255,255,0.04)",
            animation: "shimmer 1.4s infinite 0.1s"
          }}
        />
      </div>

      {/* 统计卡片骨架 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
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

      {/* 内容区骨架 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px"
        }}
      >
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "220px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.03)",
              animation: `shimmer 1.4s infinite ${0.2 + i * 0.1}s`
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
