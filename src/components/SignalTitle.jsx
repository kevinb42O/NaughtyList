function SignalTitle({ code, eyebrow, title, mark = '21', divider = '//', size = 'page', bracketed = false, className = '' }) {
  const isHero = size === 'hero'
  const label = code || eyebrow

  if (isHero) {
    const titleLabel = [label, mark, divider, title].filter(Boolean).join(' ')

    return (
      <h1 aria-label={titleLabel} className={`flex flex-col gap-3 text-white ${className}`.trim()}>
        {label ? (
          <span className="text-[0.68rem] font-black uppercase tracking-[0.42em] text-red-200/80 sm:text-[0.76rem]">
            {label}
          </span>
        ) : null}
        <span className="inline-flex max-w-full flex-wrap items-center gap-2 text-5xl font-black uppercase leading-none tracking-[0.08em] sm:text-6xl">
          {bracketed ? <span className="text-red-500/80">[</span> : null}
          <span className="signal-title-gradient drop-shadow-[0_0_24px_rgba(239,68,68,0.22)]">{mark}</span>
          <span className="text-red-400/75">{divider}</span>
          <span className="signal-title-gradient signal-title-word drop-shadow-[0_0_28px_rgba(239,68,68,0.26)]">
            {title}
          </span>
          {bracketed ? <span className="text-red-500/80">]</span> : null}
        </span>
      </h1>
    )
  }

  return (
    <h1 aria-label={[label, title].filter(Boolean).join(' ')} className={`flex min-w-0 flex-col gap-2 text-white ${className}`.trim()}>
      {label ? (
        <span className="text-[0.68rem] font-black uppercase tracking-[0.34em] text-red-200/75 sm:text-[0.72rem]">
          {label}
        </span>
      ) : null}
      <span className="signal-title-gradient max-w-full break-words text-3xl font-black uppercase leading-none tracking-[0.04em] sm:text-4xl">
        {title}
      </span>
    </h1>
  )
}

export default SignalTitle