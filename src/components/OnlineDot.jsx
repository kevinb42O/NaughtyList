function OnlineDot({ online, label = true }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online
            ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.85)]'
            : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.65)]'
        }`}
        aria-hidden="true"
      />
      {label ? (
        <span className={`text-[0.62rem] font-black uppercase tracking-[0.18em] ${online ? 'text-green-200' : 'text-red-200'}`}>
          {online ? 'Online' : 'Offline'}
        </span>
      ) : null}
    </span>
  )
}

export default OnlineDot
