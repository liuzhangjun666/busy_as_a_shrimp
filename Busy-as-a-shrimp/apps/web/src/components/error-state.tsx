export function ErrorState({ title, text }: { title: string; text: string }) {
  return (
    <section className="glass-card state-card">
      <h3 className="state-title">{title}</h3>
      <p className="state-text state-text-danger">{text}</p>
    </section>
  );
}
