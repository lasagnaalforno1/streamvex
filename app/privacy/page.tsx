import Link from "next/link";

export const metadata = { title: "Privacy Policy — StreamVex" };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors mb-8 inline-block">
          ← Back to StreamVex
        </Link>

        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">1. What we collect</h2>
            <p>
              StreamVex collects your email address when you create an account. We also store
              the video clips you upload for processing, along with the configuration settings
              you choose in the editor (layout, crop, trim).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">2. How we use your data</h2>
            <p>
              Your data is used solely to provide the StreamVex service — converting your clips
              to vertical format and making them available for download. We do not sell your data
              or share it with third parties for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">3. Data storage</h2>
            <p>
              Your account data and clip files are stored securely via Supabase, hosted on
              infrastructure in the EU/US. Clip files are stored in a private bucket and are
              only accessible to your authenticated account.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">4. Cookies</h2>
            <p>
              StreamVex uses essential session cookies to keep you signed in. We do not use
              tracking or advertising cookies. Theme and preference settings are stored in your
              browser&apos;s localStorage.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">5. Your rights</h2>
            <p>
              You can request a copy of your data or deletion of your account at any time by
              emailing{" "}
              <a href="mailto:privacy@streamvex.com" className="text-violet-400 hover:text-violet-300 underline">
                privacy@streamvex.com
              </a>
              . We will process your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">6. Contact</h2>
            <p>
              Questions about this policy?{" "}
              <a href="mailto:privacy@streamvex.com" className="text-violet-400 hover:text-violet-300 underline">
                privacy@streamvex.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
