import Link from "next/link";
import { PRO_PRICE } from "@/lib/constants";

const proFeatures = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
      </svg>
    ),
    title: "Auto Subtitles",
    description:
      "AI transcribes your clip and burns captions directly into the video. No editing, no SRT files.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
    ),
    title: "Premium Templates",
    description:
      "Cinematic blur background, reaction-cam layouts, and exclusive designs added every month.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
    title: "Cinematic Blur BG",
    description:
      "Your gameplay fills the frame with a smooth, depth-blurred background — no black bars, ever.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Priority Exports",
    description:
      "Pro clips jump the processing queue. Get your vertical shorts in seconds, not minutes.",
  },
];

export default function ProFeatures() {
  return (
    <section className="py-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-violet-700/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-fuchsia-700/8 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          {/* PRO pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                           bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20
                           border border-violet-500/30 text-violet-300 text-xs font-bold tracking-wider
                           shadow-sm shadow-violet-900/30 mb-5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            PRO
          </span>

          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Upgrade to{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Pro
            </span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Go beyond the basics. Pro unlocks AI-powered features that turn
            raw clips into polished content automatically.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {proFeatures.map((feature) => (
            <div
              key={feature.title}
              className="relative rounded-xl p-5 border border-violet-500/20 bg-gradient-to-b from-violet-950/40 to-zinc-900/60
                         hover:border-violet-500/50 hover:from-violet-950/60 hover:shadow-lg hover:shadow-violet-900/30
                         transition-all duration-200 group"
            >
              {/* Subtle glow on card */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-violet-600/5 to-fuchsia-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-600/25 to-fuchsia-600/25 text-fuchsia-300
                                flex items-center justify-center mb-4
                                group-hover:from-violet-600/40 group-hover:to-fuchsia-600/40 group-hover:text-fuchsia-200
                                transition-all duration-200 shadow-sm shadow-violet-900/30">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-zinc-100 group-hover:text-white mb-2 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 group-hover:text-zinc-400 text-sm leading-relaxed transition-colors">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/signup?plan=pro"
            className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Unlock Pro features — ${PRO_PRICE}/mo
          </Link>
          <p className="text-xs text-zinc-600 mt-3">No credit card required to start. Upgrade any time.</p>
        </div>
      </div>
    </section>
  );
}
