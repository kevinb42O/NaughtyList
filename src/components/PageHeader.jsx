function PageHeader({ eyebrow, title, children }) {
  return (
    <header className="panel mb-6 rounded-[1.6rem] px-5 py-5 sm:px-6">
      <p className="intel-label mb-3 text-red-100">{eyebrow}</p>
      <h1 className="text-3xl font-black uppercase tracking-[0.04em] text-white sm:text-4xl">
        {title}
      </h1>
      {children ? <div className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{children}</div> : null}
    </header>
  )
}

export default PageHeader
