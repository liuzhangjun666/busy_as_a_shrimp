export function ErrorState({ title, text }: { title: string; text: string }) {
  return (
    <section className="glass card state">
      <h3 className="card-title">{title}</h3>
      <p className="small error">{text}</p>
    </section>
  );
}
