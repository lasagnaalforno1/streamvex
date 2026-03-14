import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/60 py-10 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-zinc-400">StreamVex</span>
        </div>

        <p className="text-xs text-zinc-600">
          © {new Date().getFullYear()} StreamVex. All rights reserved.
        </p>

        <div className="flex items-center gap-5 text-xs text-zinc-600">
          <Link href="#" className="hover:text-zinc-400 transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-zinc-400 transition-colors">Terms</Link>
          <Link href="#" className="hover:text-zinc-400 transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
