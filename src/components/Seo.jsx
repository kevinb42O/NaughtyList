import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

const siteUrl = 'https://21rats.be'
const siteName = '21rats'
const defaultImage = `${siteUrl}/ratslogo.png`
const defaultKeywords = [
  '21rats',
  'B21 watchlist',
  'Building 21 intel',
  'Building 21 tracker',
  'DMZ reputation tracker',
  'DMZ clans',
  'Modern Warfare II DMZ',
  'operator reputation',
  'clan directory',
  'squad intel',
]

const routeSeo = {
  '/': {
    title: '21rats | B21, Building 21, DMZ Operator Reputation Tracker',
    description:
      'Track Building 21 and DMZ operator reputation, hostile patterns, clan tags, squad notes, and repeat trouble across Modern Warfare II extraction runs.',
    keywords: [
      'B21 operator tracker',
      'Building 21 operator reputation',
      'DMZ threat tracker',
      'DMZ watchlist',
      'Modern Warfare II Building 21',
      'squad reputation board',
    ],
  },
  '/clans': {
    title: 'Building 21 Clans | 21rats DMZ Clan Directory',
    description:
      'Browse and manage Building 21 clans, clan tags, member roles, join requests, invites, and tactical DMZ squad coordination on 21rats.',
    keywords: [
      'Building 21 clans',
      'DMZ clan directory',
      'DMZ clan tags',
      'Modern Warfare II clans',
      'squad recruitment',
    ],
  },
  '/leaderboard': {
    title: 'Most Wanted DMZ Leaderboard | 21rats',
    description:
      'See the 21rats priority leaderboard for documented hostile patterns, repeat DMZ problems, trust scores, and Building 21 watchlist heat.',
    keywords: [
      'DMZ leaderboard',
      'Building 21 most wanted',
      'operator trust score',
      'B21 threat ranking',
    ],
  },
  '/profiles': {
    title: 'DMZ Squad Profiles | 21rats',
    description:
      'Find squad profiles, online status, clan tags, operator bios, and Activision IDs for Building 21 and DMZ coordination.',
    keywords: [
      'DMZ squad profiles',
      'Building 21 team finder',
      'Activision ID directory',
      'clan profile',
    ],
  },
  '/chat': {
    title: 'Building 21 Clan Chat | 21rats',
    description:
      'Coordinate DMZ runs, clan operations, Building 21 intel, and squad updates through the 21rats chat network.',
    keywords: ['DMZ chat', 'Building 21 chat', 'clan chat', 'squad coordination'],
  },
  '/auth': {
    title: 'Login | 21rats',
    description: 'Log in to submit 21rats intel, manage your profile, and coordinate with DMZ clans.',
    noindex: true,
  },
  '/profile': {
    title: 'My Profile | 21rats',
    description: 'Manage your 21rats profile, clan identity, game accounts, and Building 21 squad presence.',
    noindex: true,
  },
  '/messages': {
    title: 'Direct Messages | 21rats',
    description: 'Private 21rats direct messages for squad coordination.',
    noindex: true,
  },
  '/moderator': {
    title: 'Moderator Console | 21rats',
    description: 'Private moderation tools for 21rats.',
    noindex: true,
  },
  '/admin': {
    title: 'Admin Console | 21rats',
    description: 'Private administration tools for 21rats.',
    noindex: true,
  },
}

function findRouteSeo(pathname) {
  if (pathname.startsWith('/profiles/')) {
    return {
      title: 'Public Squad Profile | 21rats',
      description: 'View a public 21rats squad profile for Building 21 and DMZ coordination.',
      noindex: true,
    }
  }

  return routeSeo[pathname] ?? routeSeo['/']
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('meta')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector)

  if (!element) {
    element = document.createElement('link')
    document.head.appendChild(element)
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
}

function upsertJsonLd(id, data) {
  let element = document.getElementById(id)

  if (!element) {
    element = document.createElement('script')
    element.id = id
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }

  element.textContent = JSON.stringify(data)
}

function Seo() {
  const location = useLocation()
  const seo = useMemo(() => findRouteSeo(location.pathname), [location.pathname])

  useEffect(() => {
    const canonicalUrl = `${siteUrl}${location.pathname === '/' ? '/' : location.pathname}`
    const keywords = [...defaultKeywords, ...(seo.keywords ?? [])].join(', ')
    const robots = seo.noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large'

    document.title = seo.title
    upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl })
    upsertMeta('meta[name="description"]', { name: 'description', content: seo.description })
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywords })
    upsertMeta('meta[name="robots"]', { name: 'robots', content: robots })
    upsertMeta('meta[name="application-name"]', { name: 'application-name', content: siteName })
    upsertMeta('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title', content: siteName })
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: siteName })
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title })
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description })
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl })
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: defaultImage })
    upsertMeta('meta[property="og:image:alt"]', { property: 'og:image:alt', content: '21rats Building 21 intel logo' })
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' })
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title })
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description })
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: defaultImage })
    upsertJsonLd('site-structured-data', {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          name: siteName,
          url: `${siteUrl}/`,
          description: routeSeo['/'].description,
          inLanguage: 'en',
          potentialAction: {
            '@type': 'SearchAction',
            target: `${siteUrl}/?q={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'WebApplication',
          '@id': `${siteUrl}/#app`,
          name: siteName,
          url: `${siteUrl}/`,
          applicationCategory: 'GameApplication',
          operatingSystem: 'Web',
          image: defaultImage,
          description: routeSeo['/'].description,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'EUR',
          },
        },
        {
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: siteName,
          url: `${siteUrl}/`,
          logo: defaultImage,
        },
      ],
    })
  }, [location.pathname, seo])

  return null
}

export default Seo