import styles from "../page.module.css";

export default function AnnouncementsLoading() {
  return (
    <div className={styles.page} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            height: "28px",
            width: "140px",
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

      <div
        style={{
          height: "220px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          animation: "shimmer 1.4s infinite 0.15s"
        }}
      />
      <div
        style={{
          height: "160px",
          borderRadius: "14px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.03)",
          animation: "shimmer 1.4s infinite 0.25s"
        }}
      />

      <style>{`@keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
    </div>
  );
}
