export default function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide
                  bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white
                  shadow-sm shadow-violet-900/50 ${className}`}
    >
      PRO
    </span>
  );
}
