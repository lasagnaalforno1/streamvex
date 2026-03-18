import Link from "next/link";

export const metadata = { title: "Terms of Service — StreamVex" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors mb-8 inline-block">
          ← Back to StreamVex
        </Link>

        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">1. Acceptance</h2>
            <p>
              By creating a StreamVex account or using the service, you agree to these Terms of
              Service. If you do not agree, do not use StreamVex.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">2. Your content</h2>
            <p>
              You retain full ownership of the video clips you upload. By uploading, you grant
              StreamVex a temporary licence to process your files for the purpose of clip
              conversion. We do not claim any rights to your content.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">3. Acceptable use</h2>
            <p>
              You agree not to use StreamVex to upload content that is illegal, infringing,
              harmful, or violates the rights of others. Accounts found in violation may be
              suspended without notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">4. Service availability</h2>
            <p>
              StreamVex is provided &ldquo;as is&rdquo; without guarantees of uptime or
              availability. We reserve the right to modify, suspend, or discontinue the service
              at any time with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">5. Limitation of liability</h2>
            <p>
              StreamVex is not liable for any loss of data, loss of revenue, or indirect damages
              arising from your use of the service. Our total liability is limited to the amount
              you paid in the past 3 months.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">6. Changes to terms</h2>
            <p>
              We may update these terms from time to time. Continued use of StreamVex after
              changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">7. Contact</h2>
            <p>
              Questions?{" "}
              <a href="mailto:support@streamvex.com" className="text-violet-400 hover:text-violet-300 underline">
                support@streamvex.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
