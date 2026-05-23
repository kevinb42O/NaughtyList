import { ChevronDown } from 'lucide-react'

function CollapsiblePanel({
  children,
  className = '',
  defaultOpen = true,
  description,
  eyebrow,
  icon: Icon,
  meta,
  title,
}) {
  return (
    <details className={`group panel rounded-[1.8rem] p-0 ${className}`} defaultOpen={defaultOpen}>
      <summary className="flex cursor-pointer list-none flex-col gap-4 p-5 marker:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {Icon ? <Icon className="h-5 w-5 text-red-100" aria-hidden="true" /> : null}
            {eyebrow ? <p className="intel-label">{eyebrow}</p> : null}
            {meta ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] text-gray-500">
                {meta}
              </span>
            ) : null}
          </div>
          <h2 className="mt-3 text-xl font-black uppercase leading-tight tracking-[0.04em] text-white sm:text-2xl">{title}</h2>
          {description ? <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-400">{description}</p> : null}
        </div>
        <span className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 px-4 text-[0.62rem] font-black uppercase tracking-[0.16em] text-red-100 transition group-open:border-white/10 group-open:bg-white/[0.04] group-open:text-gray-400">
          <span className="group-open:hidden">Open</span>
          <span className="hidden group-open:inline">Close</span>
          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="border-t border-white/10 px-5 pb-5 pt-4">
        {children}
      </div>
    </details>
  )
}

export default CollapsiblePanel
