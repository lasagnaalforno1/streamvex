import Link from "next/link";

export const metadata = { title: "Cookie Policy — StreamVex" };

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-violet-400 hover:text-violet-300 transition-colors mb-8 inline-block">
          ← Back to StreamVex
        </Link>

        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Cookie Policy</h1>
        <p className="text-sm text-zinc-500 mb-10">Last updated: March 2026</p>

        <div className="space-y-8 text-sm text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">What are cookies?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. They are
              widely used to make websites work correctly and to provide information to the site
              owners.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">How StreamVex uses cookies</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="font-medium text-zinc-300 mb-1">Session cookies (essential)</p>
                <p>
                  Used to keep you signed in while you use StreamVex. These are required for the
                  service to function and cannot be disabled.
                </p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="font-medium text-zinc-300 mb-1">localStorage (preferences)</p>
                <p>
                  Your theme and language preferences are stored in your browser&apos;s localStorage
                  — not a cookie, but a similar local storage mechanism. No data is sent to our
                  servers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">What we do not use</h2>
            <p>
              StreamVex does not use advertising cookies, tracking cookies, or third-party
              analytics cookies. We do not share any cookie data with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Managing cookies</h2>
            <p>
              You can clear cookies and localStorage at any time via your browser settings.
              Clearing session cookies will sign you out of StreamVex.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-zinc-200 mb-2">Contact</h2>
            <p>
              Questions about cookies?{" "}
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
