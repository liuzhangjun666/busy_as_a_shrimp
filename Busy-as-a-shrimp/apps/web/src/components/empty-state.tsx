export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section className="glass-card state-card">
      <h3 className="state-title">{title}</h3>
      <p className="state-text">{text}</p>
    </section>
  );
}
