import {
  Bell,
  CheckCircle2,
  CircleHelp,
  Crosshair,
  Download,
  ExternalLink,
  History,
  Home,
  Lock,
  MessageSquare,
  MoreVertical,
  Plus,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Smartphone,
  UsersRound,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'

const installSteps = [
  {
    platform: 'iPhone',
    icon: Share2,
    tone: 'border-sky-400/35 bg-sky-400/10 text-sky-100',
    steps: ['Open 21rats in Safari', 'Tap the Share button', 'Choose Add to Home Screen', 'Tap Add, then open 21rats from the new icon'],
  },
  {
    platform: 'Android',
    icon: MoreVertical,
    tone: 'border-green-400/35 bg-green-400/10 text-green-100',
    steps: ['Open 21rats in Chrome', 'Tap the three-dot menu', 'Choose Install app or Add to Home screen', 'Confirm Install, then launch from your home screen'],
  },
]

const notificationSteps = [
  { label: 'Install', detail: 'Add 21rats to your home screen first.', icon: Download },
  { label: 'Login', detail: 'Open the installed app and sign in.', icon: Lock },
  { label: 'Profile', detail: 'Go to Profile and tap Enable On This Device.', icon: Settings },
  { label: 'Allow', detail: 'Accept the phone permission prompt.', icon: Bell },
]

const guideSections = [
  { label: 'Start', href: '#start', icon: Home },
  { label: 'Install', href: '#install', icon: Download },
  { label: 'Alerts', href: '#alerts', icon: Bell },
  { label: 'Actions', href: '#actions', icon: Zap },
  { label: 'FAQ', href: '#faq', icon: CircleHelp },
]

const quickActions = [
  {
    title: 'Find a player',
    text: 'Use Home search for a name or clan tag. The filter pills narrow the list by KOS, Caution, Friendly, or All.',
    icon: Search,
    to: '/',
    action: 'Open Home',
  },
  {
    title: 'Log a kill',
    text: 'Tap Log Kill on a player row after an encounter. Each enemy has a short cooldown so one person cannot spam the count.',
    icon: Crosshair,
    to: '/',
    action: 'Open Watchlist',
  },
  {
    title: 'Make or join a clan',
    text: 'Open Clan HQ. If you are not in a clan, create one, accept an invite, or request access from the clan directory.',
    icon: Shield,
    to: '/clans',
    action: 'Open Clan HQ',
  },
  {
    title: 'Send messages',
    text: 'Use Chat for public or clan rooms. Use DMs for private one-to-one squad coordination.',
    icon: MessageSquare,
    to: '/messages',
    action: 'Open DMs',
  },
]

const faqGroups = [
  {
    title: 'Basics',
    icon: CircleHelp,
    questions: [
      {
        question: 'What is 21rats for?',
        answer: '21rats is a Building 21 intel board for tracking operator reputation, hostile patterns, clans, squad profiles, chat, direct messages, and phone alerts.',
      },
      {
        question: 'Do I need an account?',
        answer: 'You can browse some intel without logging in, but you need an account to manage your profile, join clans, chat, send DMs, log kills, and enable notifications.',
      },
      {
        question: 'What do KOS, Caution, and Friendly mean?',
        answer: 'KOS marks hostile or repeat-problem operators. Caution is for players who need watching. Friendly is for known safe or useful contacts.',
      },
      {
        question: 'What is the leaderboard?',
        answer: 'The leaderboard ranks the hottest intel by priority, reputation, kills, and threat signals so the squad can scan quickly before a run.',
      },
      {
        question: 'Is this mainly for phones?',
        answer: 'Yes. The layout works on desktop, but the main flow is built for phones because most users check intel, messages, and alerts between runs.',
      },
    ],
  },
  {
    title: 'Phone Setup',
    icon: Smartphone,
    questions: [
      {
        question: 'How do I install 21rats on my home screen?',
        answer: 'On iPhone, use Safari, tap Share, choose Add to Home Screen, then Add. On Android, use Chrome, open the three-dot menu, choose Install app or Add to Home screen, then confirm.',
      },
      {
        question: 'Why should I install it instead of using a browser tab?',
        answer: 'The installed app opens full-screen, is faster to reach during squad planning, and is the most reliable way to receive phone notifications.',
      },
      {
        question: 'How do I enable notifications?',
        answer: 'Install the app, log in, open Profile, tap Enable On This Device, then allow the phone permission prompt. Do this on each phone where you want alerts.',
      },
      {
        question: 'Why are notifications not working on iPhone?',
        answer: 'Use Safari to add 21rats to the home screen, open the installed icon, then enable notifications from Profile. iPhone web notifications require the installed app experience.',
      },
      {
        question: 'Why are notifications blocked?',
        answer: 'If you previously denied permission, open the phone browser or site settings for 21rats and switch notifications back to Allow, then retry from Profile.',
      },
      {
        question: 'Do I need to enable notifications on every device?',
        answer: 'Yes. Push notifications are saved per device, so repeat the Profile setup on each phone where you want alerts.',
      },
    ],
  },
  {
    title: 'Profile',
    icon: Settings,
    questions: [
      {
        question: 'What should I put in my profile?',
        answer: 'Set your display name, short bio, Activision IDs, and account status so teammates can recognize you and know which account you are using.',
      },
      {
        question: 'How do avatar badges unlock?',
        answer: 'Open the app daily to build a login streak. More streak days unlock more profile avatar badges.',
      },
      {
        question: 'Can I track multiple Activision IDs?',
        answer: 'Yes. Add every game account in Profile and update each account shadowban status separately.',
      },
      {
        question: 'How do I change my password?',
        answer: 'Open Profile, go to Change Password, enter the new password twice, and save it there.',
      },
      {
        question: 'Why should I add my Activision IDs?',
        answer: 'They help teammates identify you correctly, especially if you switch accounts or need to explain shadowban status before grouping up.',
      },
    ],
  },
  {
    title: 'Clans',
    icon: Shield,
    questions: [
      {
        question: 'How do I make a clan?',
        answer: 'Log in, open Clan HQ, and use Create Clan. Add a clan name, tag, and short description so people know who you are recruiting.',
      },
      {
        question: 'How do I join a clan?',
        answer: 'Open Clan HQ, search the clan directory, and request access. You can also accept an invite from the Pending Invites section.',
      },
      {
        question: 'Who can manage a clan?',
        answer: 'Owners and officers can manage most clan access tasks. Owners can edit the clan profile, archive the clan, and transfer ownership.',
      },
      {
        question: 'Where is clan chat?',
        answer: 'Open Chat and switch to the clan room. Only members of that clan can send in their clan room.',
      },
      {
        question: 'Can I be in more than one clan?',
        answer: 'No. A profile has one active social clan at a time, which keeps clan tags, roles, and clan chat permissions clear.',
      },
    ],
  },
  {
    title: 'Comms',
    icon: MessageSquare,
    questions: [
      {
        question: 'What is public chat for?',
        answer: 'Public chat is for general squad updates, quick intel, and coordination that everyone signed in can see.',
      },
      {
        question: 'What are DMs for?',
        answer: 'DMs are private messages between two users. Use them for invites, timing, or details that do not belong in public chat.',
      },
      {
        question: 'What does Drop In do?',
        answer: 'Drop In sends a quick online ping so people know you are around and ready to squad up.',
      },
      {
        question: 'Can I react to messages?',
        answer: 'Yes. Use message reactions in chat and DMs for fast acknowledgements without sending another message.',
      },
      {
        question: 'Why do DMs show an unread badge?',
        answer: 'The badge counts private messages sent to you that you have not opened yet. Opening the thread marks those messages read.',
      },
    ],
  },
  {
    title: 'Intel Rules',
    icon: UsersRound,
    questions: [
      {
        question: 'Who can add or edit players?',
        answer: 'Admin and moderator tools control higher-risk actions. Normal users can contribute through available logged-in actions such as kills, chat, and profile information.',
      },
      {
        question: 'What should notes include?',
        answer: 'Keep notes short and useful: behavior, encounter pattern, clan tag, evidence link, or anything that helps the squad recognize the player later.',
      },
      {
        question: 'Can admins reorder the watchlist?',
        answer: 'Yes. Admins can drag the list when no search or threat filter is active. Filtered views sort by priority instead.',
      },
      {
        question: 'What if intel is wrong?',
        answer: 'Ask a moderator or admin to review it. The goal is useful squad intel, so bad or stale information should be corrected.',
      },
      {
        question: 'What should I avoid posting?',
        answer: 'Avoid private personal details, drama, and vague accusations. Keep reports focused on in-game names, behavior, clips, and useful encounter context.',
      },
    ],
  },
]

function PhoneFrame({ title, children }) {
  return (
    <div className="mx-auto w-full max-w-[18rem] rounded-[2rem] border border-white/12 bg-zinc-950 p-2 shadow-2xl shadow-black/40">
      <div className="rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(5,5,8,0.98))] p-3">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/15" />
        <p className="text-center text-[0.58rem] font-black uppercase tracking-[0.22em] text-gray-500">{title}</p>
        {children}
      </div>
    </div>
  )
}

function InstallCard({ item }) {
  const Icon = item.icon
  const isIphone = item.platform === 'iPhone'

  return (
    <article className="panel rounded-[1.8rem] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="intel-label">Install Guide</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-white">{item.platform}</h2>
        </div>
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${item.tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <PhoneFrame title={`${item.platform} home screen`}>
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <span className="truncate text-[0.58rem] font-black uppercase tracking-[0.14em] text-gray-500">
              {isIphone ? 'Safari' : 'Chrome'} / 21rats.be
            </span>
            <Icon className="h-4 w-4 shrink-0 text-indigo-100" aria-hidden="true" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[Home, Search, Bell].map((VisualIcon, visualIndex) => (
              <span key={visualIndex} className="flex aspect-square items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-gray-300">
                <VisualIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {item.steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/12 text-[0.68rem] font-black text-indigo-100">
                {index + 1}
              </span>
              <span className="text-xs font-bold leading-5 text-gray-300">{step}</span>
            </div>
          ))}
        </div>
      </PhoneFrame>
    </article>
  )
}

function NotificationFlow() {
  return (
    <section className="panel rounded-[1.8rem] p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="intel-label">Phone Alerts</p>
          <h2 className="mt-2 text-2xl font-black uppercase tracking-[0.04em] text-white">Enable Notifications</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Set this up once per phone. The Profile button saves that device for future squad alerts.
          </p>
        </div>
        <Link
          to="/profile"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 text-sm font-black uppercase tracking-[0.18em] text-yellow-100 transition hover:bg-yellow-400/20"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          Profile
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {notificationSteps.map((step, index) => {
          const Icon = step.icon

          return (
            <article key={step.label} className="rounded-[1.4rem] border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-indigo-100">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-gray-600">0{index + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-black uppercase tracking-[0.04em] text-white">{step.label}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-400">{step.detail}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function QuickAction({ item }) {
  const Icon = item.icon

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-black/25 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/25 bg-indigo-500/10 text-indigo-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-black uppercase tracking-[0.04em] text-white">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{item.text}</p>
          <Link
            to={item.to}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-[0.68rem] font-black uppercase tracking-[0.18em] text-gray-300 transition hover:border-indigo-500/40 hover:text-indigo-100"
          >
            {item.action}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function FaqGroup({ group }) {
  const Icon = group.icon

  return (
    <section className="panel rounded-[1.8rem] p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-indigo-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="intel-label">FAQ</p>
          <h2 className="text-xl font-black uppercase tracking-[0.04em] text-white">{group.title}</h2>
        </div>
      </div>
      <div className="divide-y divide-white/10 rounded-[1.2rem] border border-white/10 bg-black/20">
        {group.questions.map((item) => (
          <details key={item.question} className="group p-4 open:bg-white/[0.02]">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm font-black uppercase tracking-[0.08em] text-gray-200 marker:hidden">
              <span>{item.question}</span>
              <Plus className="mt-0.5 h-4 w-4 shrink-0 text-indigo-200 transition group-open:rotate-45" aria-hidden="true" />
            </summary>
            <p className="mt-3 text-sm leading-6 text-gray-400">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function Help() {
  return (
    <div>
      <PageHeader eyebrow="Help Desk" title="Field Manual">
        <span>
          Visual setup guide, phone install steps, notifications, clans, comms, profiles, and the quick answers users usually ask first.
        </span>
        <Link
          to="/updates"
          className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[0.6rem] font-black uppercase tracking-[0.16em] text-gray-500 transition hover:border-indigo-400/35 hover:text-indigo-100"
        >
          <History className="h-3.5 w-3.5" aria-hidden="true" />
          Update Log
        </Link>
      </PageHeader>

      <nav className="mb-5 grid grid-cols-2 gap-2 rounded-[1.4rem] border border-white/10 bg-black/25 p-2 sm:grid-cols-5" aria-label="Help sections">
        {guideSections.map((section) => {
          const Icon = section.icon

          return (
            <a
              key={section.href}
              href={section.href}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-gray-300 transition hover:border-indigo-500/40 hover:text-indigo-100"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {section.label}
            </a>
          )
        })}
      </nav>

      <section id="start" className="scroll-mt-24 mb-5 grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-stretch">
        <div className="panel rounded-[1.8rem] p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <PhoneFrame title="21rats ready">
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Home', icon: Home },
                  { label: 'Clans', icon: Shield },
                  { label: 'DMs', icon: Send },
                  { label: 'Alerts', icon: Bell },
                  { label: 'Kills', icon: Crosshair },
                  { label: 'Profile', icon: Settings },
                ].map((item) => {
                  const Icon = item.icon

                  return (
                    <div key={item.label} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] text-center">
                      <Icon className="h-4 w-4 text-indigo-100" aria-hidden="true" />
                      <span className="text-[0.52rem] font-black uppercase tracking-[0.12em] text-gray-400">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </PhoneFrame>
            <div className="min-w-0 flex-1">
              <p className="intel-label mb-3">Start Here</p>
              <h2 className="text-3xl font-black uppercase leading-none tracking-[0.04em] text-white sm:text-4xl">
                Install it, log in, enable alerts.
              </h2>
              <p className="mt-4 text-sm leading-6 text-gray-400">
                Most people use 21rats on their phone. Installing it gives everyone the same quick-launch experience and makes notification setup easier to explain.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-green-400/35 bg-green-400/10 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.18em] text-green-100">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Works on phone
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/35 bg-indigo-500/10 px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.18em] text-indigo-100">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Squad alerts
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Link to="/profile" className="rounded-[1.5rem] border border-yellow-400/35 bg-yellow-400/10 p-5 transition hover:bg-yellow-400/15">
            <Bell className="h-6 w-6 text-yellow-100" aria-hidden="true" />
            <p className="mt-4 text-lg font-black uppercase tracking-[0.04em] text-white">Enable phone alerts</p>
            <p className="mt-2 text-sm leading-6 text-yellow-50/70">Profile has the real device setup button.</p>
          </Link>
          <Link to="/clans" className="rounded-[1.5rem] border border-indigo-400/30 bg-indigo-500/10 p-5 transition hover:bg-indigo-500/15">
            <UsersRound className="h-6 w-6 text-indigo-100" aria-hidden="true" />
            <p className="mt-4 text-lg font-black uppercase tracking-[0.04em] text-white">Create or join a clan</p>
            <p className="mt-2 text-sm leading-6 text-indigo-50/70">Clan HQ handles invites, requests, roles, and rooms.</p>
          </Link>
        </div>
      </section>

      <section id="install" className="scroll-mt-24 mb-5 grid gap-5 lg:grid-cols-2">
        {installSteps.map((item) => <InstallCard key={item.platform} item={item} />)}
      </section>

      <div id="alerts" className="scroll-mt-24 mb-5">
        <NotificationFlow />
      </div>

      <section id="actions" className="scroll-mt-24 mb-5 panel rounded-[1.8rem] p-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-indigo-100">
            <Smartphone className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="intel-label">Quick Answers</p>
            <h2 className="text-2xl font-black uppercase tracking-[0.04em] text-white">Common Moves</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((item) => <QuickAction key={item.title} item={item} />)}
        </div>
      </section>

      <div id="faq" className="scroll-mt-24 grid gap-5 xl:grid-cols-2">
        {faqGroups.map((group) => <FaqGroup key={group.title} group={group} />)}
      </div>
    </div>
  )
}

export default Help
