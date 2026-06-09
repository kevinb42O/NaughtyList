function splitTitle(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean)

  if (words.length <= 1) {
    return [words[0] || '', '']
  }

  return [words[0], words.slice(1).join(' ')]
}

function SignalTitle({ eyebrow, title, lead, rest, mark = '21', divider = '//', size = 'page', bracketed = false, className = '' }) {
  const isHero = size === 'hero'
  const label = eyebrow
  const [derivedLead, derivedRest] = splitTitle(title)
  const titleLead = lead || derivedLead
  const titleRest = rest || derivedRest

  if (isHero) {
    const titleLabel = [label, mark, divider, title].filter(Boolean).join(' ')

    return (
      <h1 aria-label={titleLabel} className={`flex flex-col gap-3 text-white ${className}`.trim()}>
        {label ? (
          <span className="text-[0.68rem] font-black uppercase tracking-[0.42em] text-gray-200/80 sm:text-[0.76rem]">
            {label}
          </span>
        ) : null}
        <span className="inline-flex max-w-full flex-wrap items-center gap-2 text-5xl font-black uppercase leading-none tracking-[0.08em] sm:text-6xl">
          {bracketed ? <span className="text-white/80">[</span> : null}
          <span className="signal-title-gradient drop-shadow-[0_0_24px_rgba(99, 102, 241,0.22)]">{mark}</span>
          <span className="text-gray-400/75">{divider}</span>
          <span className="signal-title-gradient signal-title-word drop-shadow-[0_0_28px_rgba(99, 102, 241,0.26)]">
            {title}
          </span>
          {bracketed ? <span className="text-white/80">]</span> : null}
        </span>
      </h1>
    )
  }

  return (
    <h1 aria-label={[label, title].filter(Boolean).join(' ')} className={`flex min-w-0 flex-col gap-3 text-white ${className}`.trim()}>
      {label ? (
        <span className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-gray-200/75 sm:text-[0.72rem]">
          {label}
        </span>
      ) : null}
      <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-[2.05rem] font-black uppercase leading-none tracking-[0.06em] sm:text-4xl">
        <span className="text-white/80">[</span>
        <span className="signal-title-gradient drop-shadow-[0_0_18px_rgba(99, 102, 241,0.18)]">{titleLead}</span>
        {titleRest ? (
          <>
            <span className="text-gray-400/75">{divider}</span>
            <span className="signal-title-gradient drop-shadow-[0_0_20px_rgba(99, 102, 241,0.2)]">
              {titleRest}
            </span>
          </>
        ) : null}
        <span className="text-white/80">]</span>
      </span>
    </h1>
  )
}

export default SignalTitle