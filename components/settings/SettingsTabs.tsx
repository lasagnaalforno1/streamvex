"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ProBadge from "@/components/ui/ProBadge";
import { PRO_PRICE } from "@/lib/constants";

type Tab = "account" | "preferences" | "subscription" | "privacy" | "notifications";
type Theme = "Dark" | "Light" | "System";

const TABS: { id: Tab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "subscription", label: "Subscription" },
  { id: "privacy", label: "Privacy" },
  { id: "notifications", label: "Notifications" },
];

interface Props {
  email: string;
  displayName: string;
  plan: "free" | "pro";
}

export default function SettingsTabs({
  email,
  displayName: initialDisplayName,
  plan: initialPlan,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("account");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [displayNameSaved, setDisplayNameSaved] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Preferences
  const [theme, setTheme] = useState<Theme>("Dark");
  const [language, setLanguage] = useState("en");

  // Subscription
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro">(initialPlan);
  const [upgrading, setUpgrading] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState({
    clipReady: true,
    productUpdates: false,
    tips: false,
  });

  const supabase = createClient();

  // Load persisted preferences from localStorage on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem("sv-theme") as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
      applyThemeClass(storedTheme);
    }

    const storedLang = localStorage.getItem("sv-language");
    if (storedLang) setLanguage(storedLang);

    const storedNotifs = localStorage.getItem("sv-notifications");
    if (storedNotifs) {
      try { setNotifications(JSON.parse(storedNotifs)); } catch {}
    }
  }, []);

  /* ── Account ── */

  function saveDisplayName() {
    startTransition(async () => {
      await supabase.auth.updateUser({ data: { display_name: displayName } });
      setDisplayNameSaved(true);
      setTimeout(() => setDisplayNameSaved(false), 3000);
    });
  }

  function sendPasswordReset() {
    startTransition(async () => {
      await supabase.auth.resetPasswordForEmail(email);
      setPasswordSent(true);
    });
  }

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (res.ok) {
      window.location.href = "/";
    } else {
      setDeleting(false);
      alert("Failed to delete account. Please contact support@streamvex.com.");
    }
  }

  /* ── Preferences ── */

  function applyThemeClass(t: Theme) {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (t === "Dark") {
      // explicit dark (app default — no class needed, but adding for clarity)
    } else if (t === "Light") {
      root.classList.add("light");
    } else {
      // System: follow OS preference
      if (window.matchMedia("(prefers-color-scheme: light)").matches) {
        root.classList.add("light");
      }
    }
  }

  function selectTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("sv-theme", t);
    applyThemeClass(t);
  }

  function selectLanguage(lang: string) {
    setLanguage(lang);
    localStorage.setItem("sv-language", lang);
  }

  /* ── Subscription ── */

  async function upgradeToPro() {
    setUpgrading(true);
    await supabase.auth.updateUser({ data: { plan: "pro" } });
    setCurrentPlan("pro");
    setUpgrading(false);
  }

  /* ── Notifications ── */

  function toggleNotification(key: keyof typeof notifications) {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem("sv-notifications", JSON.stringify(next));
      return next;
    });
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-zinc-800 mb-8 overflow-x-auto pb-px">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-violet-500 text-violet-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Account ─────────────────────────────────────────────────────────── */}
      {activeTab === "account" && (
        <div className="space-y-6">
          <Section title="Profile" description="Your public-facing identity on StreamVex.">
            <Field label="Email">
              <p className="text-sm text-zinc-300 mt-1">{email}</p>
              <p className="text-xs text-zinc-600 mt-0.5">Email cannot be changed here.</p>
            </Field>
            <Field label="Display name">
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  className="input-field text-sm flex-1"
                  placeholder="Your name (optional)"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <button
                  onClick={saveDisplayName}
                  disabled={isPending}
                  className="btn-secondary text-sm px-4"
                >
                  {displayNameSaved ? "Saved!" : "Save"}
                </button>
              </div>
            </Field>
          </Section>

          <Section title="Security" description="Manage how you sign in.">
            <Field label="Password">
              {passwordSent ? (
                <p className="text-sm text-emerald-400 mt-1">
                  Password reset email sent — check your inbox.
                </p>
              ) : (
                <div className="mt-1">
                  <button
                    onClick={sendPasswordReset}
                    disabled={isPending}
                    className="btn-outline text-sm px-4"
                  >
                    Send password reset email
                  </button>
                  <p className="text-xs text-zinc-600 mt-2">
                    We&apos;ll send a reset link to{" "}
                    <span className="text-zinc-500">{email}</span>.
                  </p>
                </div>
              )}
            </Field>
          </Section>

          <Section
            title="Danger zone"
            description="Irreversible actions — proceed with caution."
            danger
          >
            <Field label="Delete account">
              {!deleteConfirm ? (
                <div className="mt-1">
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="text-sm px-4 py-2 rounded-md bg-red-950/40 text-red-400 border border-red-900/50 hover:bg-red-900/50 hover:text-red-300 transition-colors"
                  >
                    Delete my account
                  </button>
                  <p className="text-xs text-zinc-600 mt-2">
                    This permanently removes your account and all clips.
                  </p>
                </div>
              ) : (
                <div className="mt-1 rounded-lg border border-red-900/40 bg-red-950/30 p-4 space-y-3">
                  <p className="text-sm text-red-300 font-medium">
                    Are you sure? This cannot be undone.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Your account and all clips will be permanently deleted.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={deleteAccount}
                      disabled={deleting}
                      className="text-sm px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                      {deleting ? "Deleting…" : "Yes, delete my account"}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Field>
          </Section>
        </div>
      )}

      {/* ── Preferences ─────────────────────────────────────────────────────── */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          <Section
            title="Appearance"
            description="Control how StreamVex looks for you."
          >
            <Field label="Theme">
              <div className="flex gap-2 mt-1">
                {(["Dark", "Light", "System"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => selectTheme(t)}
                    className={`px-4 py-1.5 rounded-md text-sm border transition-colors ${
                      theme === t
                        ? "border-violet-500/60 bg-violet-500/10 text-violet-300"
                        : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-600 mt-2">
                Light and System themes apply the class — full visual styles coming soon.
              </p>
            </Field>
          </Section>

          <Section
            title="Language"
            description="Choose your preferred language."
          >
            <Field label="Language">
              <select
                className="input-field text-sm mt-1 w-48"
                value={language}
                onChange={(e) => selectLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
              <p className="text-xs text-zinc-600 mt-2">
                UI language preference is saved. Full translations coming soon.
              </p>
            </Field>
          </Section>
        </div>
      )}

      {/* ── Subscription ────────────────────────────────────────────────────── */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          <Section
            title="Current plan"
            description={currentPlan === "pro" ? "You have full Pro access." : "You're on the Free plan."}
          >
            <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                    Current plan
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-zinc-100">
                      {currentPlan === "pro" ? "Pro" : "Free"}
                    </p>
                    {currentPlan === "pro" && <ProBadge />}
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Active
                </span>
              </div>

              {/* Feature list */}
              <ul className="space-y-2 text-sm text-zinc-400">
                {(currentPlan === "pro"
                  ? [
                      "1080p / 60fps export",
                      "No watermark",
                      "Premium templates",
                      "Blur background",
                      "Faster processing",
                    ]
                  : [
                      "Unlimited clip conversions",
                      "720p / 30fps export",
                      "StreamVex watermark",
                      "Basic templates",
                      "Trim & cuts",
                    ]
                ).map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-500 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>

              <div className="h-px bg-zinc-800" />

              {/* Upgrade CTA or Pro confirmation */}
              {currentPlan === "pro" ? (
                <p className="text-sm text-emerald-400 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  All Pro features are active on your account.
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">
                      Unlock Pro features
                    </p>
                    <p className="text-xs text-zinc-600">
                      Auto subtitles, blur background, priority exports and more.
                    </p>
                  </div>
                  <button
                    onClick={upgradeToPro}
                    disabled={upgrading}
                    className="btn-primary text-sm px-5 py-2 inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                    {upgrading ? "Activating Pro…" : `Upgrade to Pro — $${PRO_PRICE}/mo`}
                  </button>
                </div>
              )}

            </div>
          </Section>

          <Section
            title="Usage"
            description="Your activity this billing period."
          >
            <div className="grid sm:grid-cols-3 gap-3 mt-2">
              {[
                { label: "Clips this month", value: "—", sub: "Tracking coming soon" },
                { label: "Storage used", value: "—", sub: "Tracking coming soon" },
                { label: "Exports", value: "—", sub: "Tracking coming soon" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                >
                  <p className="text-xs text-zinc-500 mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-zinc-100">{stat.value}</p>
                  <p className="text-[11px] text-zinc-700 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* ── Privacy ─────────────────────────────────────────────────────────── */}
      {activeTab === "privacy" && (
        <div className="space-y-6">
          <Section
            title="Your data"
            description="We respect your privacy and only store what's needed to provide the service."
          >
            <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 space-y-2 text-sm text-zinc-400">
              <p>
                StreamVex stores your account email, clip files, and processing
                configurations in Supabase. Your data is never sold or shared with
                third parties.
              </p>
              <p>
                Clip files are stored securely in a private cloud bucket and are
                only accessible to you.
              </p>
            </div>
          </Section>

          <Section title="Legal" description="Review our policies.">
            <div className="mt-2 space-y-2">
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Cookie Policy", href: "/cookies" },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 hover:border-zinc-700 hover:bg-zinc-800/40 transition-colors group"
                >
                  <span className="text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors">
                    {link.label}
                  </span>
                  <svg
                    className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </Section>

          <Section
            title="Data requests"
            description="Your rights under GDPR and similar regulations."
          >
            <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 text-sm text-zinc-400">
              <p>
                To request a data export or account deletion, email us at{" "}
                <a
                  href="mailto:privacy@streamvex.com"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  privacy@streamvex.com
                </a>
                .
              </p>
            </div>
          </Section>
        </div>
      )}

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <div className="space-y-6">
          <Section
            title="Email notifications"
            description="Choose which emails you receive from StreamVex."
          >
            <div className="mt-2 rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
              {(
                [
                  {
                    key: "clipReady" as const,
                    label: "Clip ready",
                    description: "Notify me when a clip finishes processing",
                  },
                  {
                    key: "productUpdates" as const,
                    label: "Product updates",
                    description: "New features, templates, and improvements",
                  },
                  {
                    key: "tips" as const,
                    label: "Tips & tutorials",
                    description: "How to get the most out of StreamVex",
                  },
                ]
              ).map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-4 py-3.5 bg-zinc-900/30"
                >
                  <div>
                    <p className="text-sm text-zinc-300">{item.label}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={notifications[item.key]}
                    onClick={() => toggleNotification(item.key)}
                    className={`relative w-9 h-5 rounded-full border transition-colors focus:outline-none ${
                      notifications[item.key]
                        ? "bg-violet-600 border-violet-500"
                        : "bg-zinc-800 border-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        notifications[item.key] ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-700 mt-3">
              Preferences are saved locally. Email delivery will be configured in a future update.
            </p>
          </Section>
        </div>
      )}
    </div>
  );
}

/* ── Helper sub-components ──────────────────────────────────────────────── */

function Section({
  title,
  description,
  danger = false,
  children,
}: {
  title: string;
  description: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-6 ${
        danger
          ? "border-red-900/40 bg-red-950/10"
          : "border-zinc-800 bg-zinc-900/30"
      }`}
    >
      <div className="mb-4">
        <h2
          className={`text-sm font-semibold ${
            danger ? "text-red-400" : "text-zinc-100"
          }`}
        >
          {title}
        </h2>
        <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      {children}
    </div>
  );
}
