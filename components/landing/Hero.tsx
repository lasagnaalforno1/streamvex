import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-700/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-purple-900/20 rounded-full blur-[80px]" />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-400" />
          </span>
          Now in Beta — Free to try
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
          Turn your stream clips
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            into viral shorts
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload horizontal gaming clips, StreamVex automatically converts them
          to 9:16 vertical format — ready for TikTok, Instagram Reels, and
          YouTube Shorts.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/signup" className="btn-primary text-base px-7 py-3">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            Start converting for free
          </Link>
          <a
            href="#features"
            className="btn-secondary text-base px-7 py-3"
          >
            See how it works
          </a>
        </div>

        {/* Social proof */}
        <p className="mt-8 text-xs text-zinc-600">
          No credit card required &nbsp;·&nbsp; Free tier includes 5 clips/month
        </p>

        {/* Mock phone preview */}
        <div className="mt-16 flex items-end justify-center gap-6">
          {/* Wide clip */}
          <div className="hidden sm:block w-64 h-36 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-zinc-700 text-xs font-mono">16:9</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-purple-600 animate-pulse" />
          </div>

          {/* Arrow */}
          <div className="text-violet-500">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>

          {/* Vertical clip */}
          <div className="w-20 h-36 rounded-xl bg-zinc-900 border border-violet-700/50 overflow-hidden relative shadow-2xl ring-1 ring-violet-500/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-zinc-600 text-xs font-mono">9:16</div>
            </div>
            <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-violet-900/20 to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
