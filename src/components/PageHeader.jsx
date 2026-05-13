import SignalTitle from './SignalTitle'

function PageHeader({ eyebrow, title, titleLead, titleRest, children }) {
  return (
    <header className="page-masthead mb-6 rounded-[1.35rem] px-5 py-5 sm:px-6">
      <SignalTitle eyebrow={eyebrow} title={title} lead={titleLead} rest={titleRest} />
      {children ? <div className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{children}</div> : null}
    </header>
  )
}

export default PageHeader
