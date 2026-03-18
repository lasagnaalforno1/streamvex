import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to start clipping and publishing on short-form platforms.",
    cta: "Get started free",
    ctaHref: "/signup",
    ctaVariant: "outline" as const,
    features: [
      "Unlimited clip conversions",
      "720p / 30fps export",
      "StreamVex watermark",
      "Basic templates (Facecam, Split, Gameplay)",
      "Trim & cuts editor",
      "Standard processing speed",
    ],
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$5",
    period: "per month",
    description: "For streamers who want to grow fast with polished, professional content.",
    cta: "Go Pro",
    ctaHref: "/signup?plan=pro",
    ctaVariant: "primary" as const,
    features: [
      "1080p / 60fps export",
      "No watermark",
      "Premium templates + Blur background",
      "Stickers & overlays",
      "Faster processing",
      "Auto subtitles (coming soon)",
    ],
    highlighted: true,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6">
      {/* Background */}
      <div className="relative max-w-5xl mx-auto">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-violet-900/10 to-transparent rounded-3xl blur-3xl" />

        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-violet-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Start for free. Upgrade when you need more.
          </p>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 border transition-all duration-200 ${
                plan.highlighted
                  ? "bg-gradient-to-b from-violet-900/50 via-purple-900/20 to-zinc-900/90 border-violet-500/60 shadow-2xl shadow-violet-900/40 ring-1 ring-violet-500/20"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold tracking-wider shadow-md shadow-violet-900/50">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-zinc-100 mb-1">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-extrabold text-zinc-50">
                    {plan.price}
                  </span>
                  <span className="text-zinc-500 text-sm">/{plan.period}</span>
                </div>
                <p className="text-zinc-500 text-sm">{plan.description}</p>
              </div>

              <Link
                href={plan.ctaHref}
                className={
                  plan.ctaVariant === "primary" ? "btn-primary w-full mb-6" : "btn-outline w-full mb-6"
                }
              >
                {plan.cta}
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-400">
                    <svg
                      className="w-4 h-4 text-violet-400 mt-0.5 shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
