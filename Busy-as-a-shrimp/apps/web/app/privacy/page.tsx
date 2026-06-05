import { LegalDocumentView } from "@/components/legal/legal-document-view";
import { privacyDocument } from "@/content/legal-documents";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-[calc(100vh-14rem)] max-w-5xl px-4 py-12 sm:px-6">
      <section className="glass-card rounded-[2rem] p-8 sm:p-10">
        <LegalDocumentView document={privacyDocument} />
      </section>
    </main>
  );
}
