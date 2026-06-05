import type { LegalDocumentDefinition } from "@/content/legal-documents";

export function LegalDocumentView({
  document,
  compact = false
}: {
  document: LegalDocumentDefinition;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-6" : "space-y-8"}>
      <div className={compact ? "space-y-3 border-b border-slate-100 pb-6" : "space-y-4 border-b border-slate-100 pb-8"}>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">
          {document.eyebrow}
        </p>
        <h1 className={compact ? "text-2xl font-black tracking-tight text-slate-900" : "text-3xl font-black tracking-tight text-slate-900"}>
          {document.title}
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          生效日期：{document.effectiveDate}。{document.summary}
        </p>
      </div>

      <div className={compact ? "space-y-6" : "space-y-8"}>
        {document.sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>

            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-7 text-slate-600">
                {paragraph}
              </p>
            ))}

            {section.bullets ? (
              <ul className="space-y-2 text-sm leading-7 text-slate-600">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
