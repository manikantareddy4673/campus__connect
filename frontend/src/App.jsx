import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Heart,
  MapPin,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  X,
} from 'lucide-react'
import { categories, categoryCards, demoEvents } from './data/events.js'
import { api } from './lib/api.js'

const navigation = [
  ['home', 'Landing'],
  ['browse', 'Browse Events'],
  ['dashboard', 'Student Dashboard'],
  ['registrations', 'My Registrations'],
  ['organizer', 'Organizer Dashboard'],
]

const attendeeSample = [
  ['Maya Patel', 'maya.patel@campus.edu', 'Oct 12, 2025', '#84920', 'Checked in'],
  ['Liam Vance', 'liam.vance@campus.edu', 'Oct 12, 2025', '#84921', 'Confirmed'],
  ['Sophia Chen', 's.chen@campus.edu', 'Oct 13, 2025', '#84922', 'Checked in'],
  ['Marcus Washington', 'm.washington@campus.edu', 'Oct 13, 2025', '#84923', 'Confirmed'],
  ['Elena Rostova', 'elena.rostova@campus.edu', 'Oct 14, 2025', '#84924', 'Awaiting'],
]

function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en', options).format(date)
    : 'Date to be announced'
}

function formatTime(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date)
    : 'Time TBD'
}

function formatPrice(price) {
  return Number(price) === 0 ? 'Free' : `₹ ${Number(price).toLocaleString('en-IN')}`
}

function getCapacity(event) {
  const hasCapacity = event.capacity !== null && event.capacity !== undefined
  const capacity = hasCapacity ? Math.max(0, Number(event.capacity)) : Number(event.seats_left) || 100
  const left = Math.min(capacity, Math.max(0, Number(event.seats_left ?? capacity)))
  const registered = Math.max(0, capacity - left)
  return { capacity, left, registered, percent: capacity ? Math.min(100, Math.round((registered / capacity) * 100)) : 100 }
}

function normalizeEvent(event, index = 0) {
  return {
    ...event,
    id: event.id || event.event_id,
    starts_at: event.starts_at || event.date || null,
    ends_at: event.ends_at || event.end_date || null,
    venue: event.venue || event.location || 'Campus venue',
    category: event.category || 'Campus',
    organizer: event.organizer || 'Campus Community',
    description: event.description || 'Meet your campus community and take part in something memorable.',
    image_url: event.image_url || demoEvents[index % demoEvents.length].image_url,
    price: Number(event.price ?? 0),
  }
}

function App() {
  const [view, setView] = useState('home')
  const [events, setEvents] = useState(demoEvents)
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('eventhub-session') || 'null')
    } catch {
      return null
    }
  })
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Events')
  const [activeEvent, setActiveEvent] = useState(null)
  const [registrations, setRegistrations] = useState([])
  const [savedEvents, setSavedEvents] = useState([])
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [role, setRole] = useState('Student')
  const [apiStatus, setApiStatus] = useState('loading')
  const [apiError, setApiError] = useState('')
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.getEvents()
      .then((data) => {
        if (!cancelled && Array.isArray(data) && data.length) {
          setEvents(data.map(normalizeEvent))
          setApiStatus('connected')
          setApiError('')
        } else if (!cancelled) {
          setEvents([])
          setApiStatus('connected')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setApiStatus('demo')
          setApiError(error.message)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!session?.access_token) {
      setRegistrations([])
      sessionStorage.removeItem('eventhub-session')
      return undefined
    }

    sessionStorage.setItem('eventhub-session', JSON.stringify(session))
    let cancelled = false
    api.getMyRegistrations(session.access_token)
      .then((records) => {
        if (cancelled || !Array.isArray(records)) return
        setRegistrations(records.map((record) => {
          const event = events.find((item) => item.id === record.event_id) || {}
          return {
            ...event,
            id: record.event_id,
            registration_id: record.id,
            confirmation_code: record.confirmation_code,
            payment_method: record.payment_method,
            amount_due: record.amount_due,
            registered_at: record.created_at,
          }
        }))
      })
      .catch((error) => {
        if (!cancelled) setNotice(error.message)
      })
    return () => { cancelled = true }
  }, [session, events])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const visibleEvents = useMemo(() => {
    const searchText = query.trim().toLowerCase()
    return events.filter((event) => {
      const matchesCategory = category === 'All Events' || event.category === category
      const searchable = `${event.title} ${event.category} ${event.venue} ${event.organizer}`.toLowerCase()
      return matchesCategory && (!searchText || searchable.includes(searchText))
    })
  }, [events, query, category])

  function navigate(nextView) {
    setView(nextView)
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openEvent(event) {
    setActiveEvent(event)
    navigate('detail')
  }

  async function registerFor(event) {
    if (registrations.some((registration) => registration.id === event.id)) {
      setNotice('You’re already registered for this event.')
      navigate('registrations')
      return
    }

    if (apiStatus === 'loading') {
      setNotice('The events API is still connecting. Please try again in a moment.')
      return
    }

    if (apiStatus === 'connected') {
      if (!session?.access_token) {
        setAuthMode('login')
        setAuthOpen(true)
        setNotice('Sign in before registering for a campus event.')
        return
      }

      try {
        const record = await api.createRegistration(session.access_token, {
          event_id: event.id,
        })
        const registration = {
          ...event,
          id: event.id,
          registration_id: record.id,
          confirmation_code: record.confirmation_code,
          payment_method: record.payment_method,
          amount_due: record.amount_due,
          registered_at: record.created_at,
          registered_count: record.registered_count,
          seats_left: record.seats_left,
        }
        setEvents((current) => current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                registered_count: record.registered_count,
                seats_left: record.seats_left,
              }
            : item,
        ))
        setActiveEvent((current) => current?.id === event.id
          ? {
              ...current,
              registered_count: record.registered_count,
              seats_left: record.seats_left,
            }
          : current)
        setRegistrations((current) => [registration, ...current.filter((item) => item.id !== event.id)])
        setNotice(`Registration confirmed — ${record.confirmation_code}`)
        navigate('registrations')
      } catch (error) {
        if (error.status === 401) {
          setSession(null)
          setAuthMode('login')
          setAuthOpen(true)
        }
        setNotice(error.message)
      }
      return
    }

    const registration = {
      ...event,
      registered_at: new Date().toISOString(),
      confirmation_code: `EH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      preview_only: true,
    }
    setRegistrations((current) => [registration, ...current])
    setNotice(`Preview only — this registration was not saved to the backend (${registration.confirmation_code}).`)
    navigate('registrations')
  }

  async function submitAuth({ email, password }) {
    setAuthBusy(true)
    try {
      const result = authMode === 'signup'
        ? await api.signUp({ email, password })
        : await api.signIn({ email, password })
      if (result.requires_email_confirmation) {
        setAuthMode('login')
        setNotice('Account created. Check your email to confirm it, then sign in.')
        return
      }
      if (!result.access_token || !result.user) {
        throw new Error('The backend did not return an authenticated session.')
      }
      setSession({
        access_token: result.access_token,
        user: result.user,
      })
      setAuthOpen(false)
      setNotice(`Signed in as ${result.user.email}.`)
    } catch (error) {
      setNotice(error.message)
    } finally {
      setAuthBusy(false)
    }
  }

  function signOut() {
    setSession(null)
    setNotice('You have been signed out.')
  }

  function cancelRegistration(id) {
    if (!registrations.some((item) => item.id === id && item.preview_only)) {
      setNotice('Cancellation is not available through the backend yet. Please contact the event organizer.')
      return
    }
    setRegistrations((current) => current.filter((registration) => registration.id !== id))
    setNotice('Your registration has been cancelled.')
  }

  function toggleSaved(id) {
    setSavedEvents((current) =>
      current.includes(id) ? current.filter((savedId) => savedId !== id) : [...current, id],
    )
  }

  function exportAttendees() {
    const rows = [
      ['Name', 'Email', 'Registration date', 'Registration ID', 'Status'],
      ...attendeeSample,
    ]
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'eventhub-attendees.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="EventHub home">
          <span className="brand-mark"><CalendarDays size={18} /></span>
          <span>Event<span>Hub</span></span>
        </button>
        <label className="top-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate('browse')
            }}
            placeholder="Search campus events..."
          />
          <kbd>⌘ K</kbd>
        </label>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={menuOpen ? 'main-nav open' : 'main-nav'}>
          {navigation.map(([key, label]) => (
            <button key={key} className={view === key ? 'nav-link active' : 'nav-link'} onClick={() => navigate(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <div className="role-switch" aria-label="Preview role">
            {['Student', 'Organizer'].map((option) => (
              <button key={option} className={role === option ? 'selected' : ''} onClick={() => setRole(option)}>
                {option}
              </button>
            ))}
          </div>
          <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up.')}>
            <Bell size={18} /><i />
          </button>
          <button
            className="avatar-button"
            onClick={() => session ? navigate(role === 'Organizer' ? 'organizer' : 'dashboard') : setAuthOpen(true)}
            aria-label={session ? 'Open account dashboard' : 'Sign in'}
            title={session?.user?.email || 'Sign in'}
          >
            {session?.user?.email?.slice(0, 1).toUpperCase() || '↗'}
          </button>
          {session && <button className="sign-out-button" onClick={signOut}>Sign out</button>}
        </div>
      </header>

      {notice && <div className="toast"><Check size={17} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
      {apiStatus === 'demo' && (
        <div className="preview-banner">
          Preview mode — {apiError || 'showing sample campus events while the API is unavailable.'}
        </div>
      )}

      {view === 'home' && (
        <LandingPage
          events={events}
          query={query}
          setQuery={setQuery}
          onBrowse={() => navigate('browse')}
          onOpen={openEvent}
          onCategory={(value) => { setCategory(value); navigate('browse') }}
          apiStatus={apiStatus}
        />
      )}
      {view === 'browse' && (
        <BrowsePage events={visibleEvents} query={query} setQuery={setQuery} category={category} setCategory={setCategory} onOpen={openEvent} savedEvents={savedEvents} onSave={toggleSaved} apiStatus={apiStatus} />
      )}
      {view === 'detail' && activeEvent && (
        <DetailPage event={activeEvent} registered={registrations.some((item) => item.id === activeEvent.id)} onBack={() => navigate('browse')} onRegister={() => registerFor(activeEvent)} />
      )}
      {view === 'dashboard' && (
        <StudentDashboard events={events} registrations={registrations} onBrowse={() => navigate('browse')} onOpen={openEvent} />
      )}
      {view === 'registrations' && (
        <RegistrationsPage registrations={registrations} onBrowse={() => navigate('browse')} onOpen={openEvent} onCancel={cancelRegistration} />
      )}
      {view === 'organizer' && (
        <OrganizerDashboard events={events} onOpenAttendees={() => navigate('attendees')} onBrowse={() => navigate('browse')} />
      )}
      {view === 'attendees' && (
        <AttendeePage event={events[0] || demoEvents[0]} onBack={() => navigate('organizer')} onExport={exportAttendees} />
      )}
      {authOpen && <AuthDialog mode={authMode} setMode={setAuthMode} onClose={() => setAuthOpen(false)} onSubmit={submitAuth} busy={authBusy} />}
      <Footer onNavigate={navigate} />
    </div>
  )
}

function HeaderLabel({ children, eyebrow }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{children}</h2>
      </div>
    </div>
  )
}

function EventCard({ event, onOpen, saved, onSave, compact = false }) {
  const capacity = getCapacity(event)
  return (
    <article className={compact ? 'event-card compact' : 'event-card'}>
      <button className="event-card-image" style={{ backgroundImage: `url("${event.image_url}")` }} onClick={() => onOpen(event)} aria-label={`View ${event.title}`}>
        <span className="event-category">{event.category}</span>
        <span className="event-date-overlay">{formatDate(event.starts_at, { month: 'short', day: 'numeric' })} · {formatTime(event.starts_at)}</span>
        {event.seats_left === 0 && <span className="sold-out-tag">Waitlist</span>}
      </button>
      <div className="event-card-content">
        <div className="event-card-title-row">
          <button className="event-card-title" onClick={() => onOpen(event)}>{event.title}</button>
          {onSave && (
            <button className={saved ? 'save-button saved' : 'save-button'} onClick={() => onSave(event.id)} aria-label={saved ? 'Remove saved event' : 'Save event'}>
              <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        <p className="event-description">{event.description}</p>
        <div className="event-meta"><span><CalendarDays size={14} />{formatDate(event.starts_at)}</span><span><MapPin size={14} />{event.venue}</span></div>
        <div className="capacity-line"><span>Capacity status</span><strong>{capacity.registered} / {capacity.capacity}</strong></div>
        <div className="progress-track"><span style={{ width: `${capacity.percent}%` }} /></div>
        <div className="event-card-footer">
          <span className="organizer-name"><span className="mini-avatar">{event.organizer.slice(0, 1)}</span>{event.organizer}</span>
          <button className="small-primary" onClick={() => onOpen(event)}>View details <ArrowRight size={14} /></button>
        </div>
      </div>
    </article>
  )
}

function LandingPage({ events, query, setQuery, onBrowse, onOpen, onCategory, apiStatus }) {
  const featured = events.slice(0, 3)
  return (
    <main>
      <section className="hero">
        <div className="hero-pill"><Sparkles size={14} /> FALL TERM 2026 CALENDAR LIVE <ArrowRight size={13} /></div>
        <h1>Discover what’s happening on <span>campus.</span></h1>
        <p>Explore academic symposiums, hackathons, club socials, and varsity sports.<br />Connect, register with one click, and never miss an event.</p>
        <div className="hero-search">
          <label><Search size={17} /><input value={query} placeholder="Search hackathons, mixers, talks..." onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onBrowse() }} /></label>
          <button className="campus-select">⌖ &nbsp; All Campus Venues <ChevronDown size={14} /></button>
          <button className="primary-button" onClick={onBrowse}>Explore events <ArrowRight size={15} /></button>
        </div>
        <div className="popular-searches"><span>POPULAR TAGS:</span>{['Hackathon', 'Career Fair', 'Networking', 'Free Food'].map((tag) => <button key={tag} onClick={onBrowse}>#{tag}</button>)}</div>
        <div className="hero-shortcuts"><button onClick={onBrowse}>◉ &nbsp; Host an event for your club</button><button onClick={onBrowse}>▧ &nbsp; Sync campus ICS</button></div>
      </section>

      <section className="stat-strip">
        <div><strong>12,400<span>+</span></strong><small>Active Undergrad & Grad Students</small></div>
        <div><strong>250<span>+</span></strong><small>Recognized Student Organizations</small></div>
        <div><strong>480</strong><small>Events Hosted This Term</small></div>
        <div><strong>98.4<span>%</span></strong><small>Check-in Attendance Accuracy</small></div>
      </section>

      <section className="content-section category-section">
        <HeaderLabel eyebrow="BROWSE BY VERTICAL">Explore campus life</HeaderLabel>
        <button className="section-link" onClick={onBrowse}>View all categories <ArrowRight size={14} /></button>
        <div className="category-grid">
          {categoryCards.map((item) => (
            <button className="category-card" key={item.title} onClick={() => onCategory(item.category)}>
              <span className="category-icon">{item.icon}</span><small>{item.count}</small>
              <strong>{item.title}</strong><span>Discover events, people, and new campus experiences.</span>
            </button>
          ))}
        </div>
      </section>

      <section className="content-section featured-section">
        <HeaderLabel eyebrow="CURATED RECOMMENDATIONS">Featured campus events</HeaderLabel>
        <div className="section-controls"><span className="active-chip">All highlights</span><span>This week</span><span>Free meals</span><span>Certificates</span></div>
        <div className="event-grid three-col">
          {featured.map((event) => <EventCard key={event.id} event={event} onOpen={onOpen} />)}
        </div>
      </section>

      <section className="content-section simplify-section">
        <div className="center-heading"><span className="eyebrow">EFFORTLESS PARTICIPATION</span><h2>Campus life, simplified</h2><p>From discovering pop-ups to saving your seat at major symposiums, everything happens with unified student credentials.</p></div>
        <div className="steps-grid">
          <StepCard number="01" title="Smart discovery">Filter by department, interest, venue, or club endorsement. Find campus events that fit your schedule.</StepCard>
          <StepCard number="02" title="1-click fast pass">Sign in with your university credentials. No external registrations, payment forms, or manual attendance slips.</StepCard>
          <StepCard number="03" title="Calendar synchronization">Stay in sync with Outlook 365 and Google Workspace. Get timely class-aware notices before events.</StepCard>
        </div>
      </section>

      <section className="campus-map-card">
        <div><span className="eyebrow">INTERACTIVE VENUE DISCOVERY</span><h2>Never get lost on campus again</h2><p>Every event published through EventHub is tied directly to the university’s authoritative GIS map. Find your venue and nearby dining, accessible entrances, parking zones, and indoor floorplans.</p><div className="map-stats"><span><strong>45</strong> Mapped academic buildings</span><span><strong>120+</strong> Reserved indoor rooms</span></div></div>
        <div className="map-illustration" aria-label="Illustrated campus map">
          <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-building b-one">SCIENCE</div><div className="map-building b-two">LIBRARY</div><div className="map-building b-three">STUDENT<br />UNION</div><span className="map-pin pin-one">●</span><span className="map-pin pin-two">●</span><span className="map-pin pin-three">●</span><span className="map-legend">⌖ &nbsp; Campus venues</span>
        </div>
      </section>

      <section className="organizer-cta">
        <div><span className="eyebrow">FOR CLUB OFFICERS & DEPARTMENT HEADS</span><h2>Tired of paper posters and fragmented group chats?</h2><p>Publish your meeting, check in attendees via quick mobile scanner, reserve campus spaces, and pull verified engagement analytics for semester funding reports.</p><div className="cta-tags"><span><ShieldCheck size={14} /> Authorized association leaders</span><span>◉ Room booking integration</span><span>◌ Badge attendance analytics</span></div></div>
        <div className="cta-buttons"><button onClick={onBrowse}>Create organizer workspace</button><button onClick={onBrowse}>Schedule admin demo</button></div>
      </section>
      <StatusBar apiStatus={apiStatus} />
    </main>
  )
}

function StepCard({ number, title, children }) {
  return <article className="step-card"><span>{number}</span><h3>{title}</h3><p>{children}</p><small>↗ &nbsp; Personalized & timely alerts</small></article>
}

function StatusBar({ apiStatus }) {
  const statusText = apiStatus === 'connected'
    ? 'Events API connected · live campus events'
    : apiStatus === 'loading'
      ? 'Connecting to the events API…'
      : 'Preview mode · showing sample campus events'
  return <div className={`status-bar ${apiStatus === 'demo' ? 'preview-status' : ''}`}><span><i /> {statusText}</span><span>EventHub Campus Network · v1.0</span></div>
}

function BrowsePage({ events, query, setQuery, category, setCategory, onOpen, savedEvents, onSave, apiStatus }) {
  return (
    <main className="dashboard-layout browse-page">
      <section className="browse-heading"><div><span className="eyebrow">● COLLEGIATE NETWORK · ACTIVE TERM</span><h1>Explore campus events</h1><p>Discover student-led initiatives, intercollegiate competitions, symposiums, and cultural gatherings across campus.</p></div><div className="view-switch"><button className="selected">▦ &nbsp;Grid</button><button>▤ &nbsp;Timeline</button></div></section>
      <section className="filter-panel">
        <label className="wide-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events by title, organizer, venue, or keywords..." /><kbd>⌘K</kbd></label>
        <div className="filter-row"><div className="category-pills">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><select aria-label="Event status"><option>All statuses</option><option>Open for registration</option><option>Waitlist</option></select><button className="filter-date"><CalendarDays size={14} />This weekend</button></div>
      </section>
      <div className="results-toolbar"><strong>{events.length} Events Found <span className={apiStatus === 'connected' ? 'live-badge' : 'demo-badge'}>{apiStatus === 'connected' ? 'Live synced' : 'Preview'}</span></strong><label>Sort by <select><option>Date: Soonest first</option><option>Most popular</option><option>Price: Low to high</option></select></label></div>
      {events.length ? <div className="event-grid three-col">{events.map((event) => <EventCard key={event.id} event={event} onOpen={onOpen} saved={savedEvents.includes(event.id)} onSave={onSave} />)}</div> : <div className="empty-state"><Search size={28} /><h3>No matching events</h3><p>Try another search or choose a different category.</p><button className="secondary-button" onClick={() => { setQuery(''); setCategory('All Events') }}>Clear filters</button></div>}
      <div className="pagination"><span>Showing {events.length ? 1 : 0}–{events.length} events</span><div><button disabled>‹</button><button className="current">1</button><button disabled>2</button><button disabled>3</button><button disabled>›</button></div></div>
    </main>
  )
}

function DetailPage({ event, registered, onBack, onRegister }) {
  const capacity = getCapacity(event)
  return (
    <main className="dashboard-layout detail-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to events</button>
      <div className="breadcrumb">Events <span>/</span> {event.category} <span>/</span> <strong>{event.title}</strong></div>
      <section className="detail-heading">
        <div><span className="eyebrow">{event.category.toUpperCase()} &nbsp;·&nbsp; <i className="live-dot" /> OPEN FOR REGISTRATION</span><h1>{event.title}</h1><div className="detail-meta"><span><CalendarDays size={16} />{formatDate(event.starts_at, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · {formatTime(event.starts_at)}</span><span><MapPin size={16} />{event.venue}</span></div></div>
        <div className="capacity-widget"><div className="capacity-widget-heading"><Users size={16} /> LIVE SEAT TRACKER <span>{capacity.percent}% filled</span></div><strong>{capacity.registered} <small>registered</small></strong><span>{capacity.left} seats remaining</span><div className="progress-track"><span style={{ width: `${capacity.percent}%` }} /></div></div>
      </section>
      <div className="detail-columns">
        <div className="detail-main">
          <div className="detail-image" style={{ backgroundImage: `url("${event.image_url}")` }}><span>FEATURED CAMPUS EVENT</span></div>
          <section className="detail-block"><h2>About the event</h2><p>{event.description}</p><p>Join students and campus community members for a thoughtfully organized experience. Whether you're here to learn, meet new people, or share your work, you'll find a welcoming place to get involved.</p><div className="detail-facts"><span><strong>{event.price === 0 ? 'Free' : formatPrice(event.price)}</strong>Admission</span><span><strong>All day</strong>Campus access</span><span><strong>{capacity.left}</strong>Seats available</span><span><strong>Open</strong>To students</span></div></section>
          <section className="detail-block"><h2>Event schedule</h2><div className="agenda-row"><strong>09:00 AM</strong><div><b>Check-in & welcome</b><span>Registration desk opens and refreshments are served.</span></div></div><div className="agenda-row"><strong>11:00 AM</strong><div><b>Featured session</b><span>Hear from our speakers, organizers, and campus community.</span></div></div><div className="agenda-row"><strong>02:30 PM</strong><div><b>Community showcase</b><span>Connect with participants and explore what’s next.</span></div></div></section>
          <section className="detail-block faq-block"><h2>Frequently asked questions</h2><details><summary>Who can attend this event?<ChevronDown size={16} /></summary><p>All currently enrolled students are welcome unless the event listing notes otherwise.</p></details><details><summary>Can I cancel my registration?<ChevronDown size={16} /></summary><p>Yes. Visit My Registrations to manage your saved campus RSVPs.</p></details><details><summary>What should I bring?<ChevronDown size={16} /></summary><p>Bring your student ID and check the event description for any additional requirements.</p></details></section>
        </div>
        <aside className="detail-aside"><div className="register-panel"><span className="eyebrow">ADMISSION TYPE</span><div className="price-row"><strong>{event.price === 0 ? 'FREE' : formatPrice(event.price)}</strong><small>per student</small></div><div className="register-benefits"><span>✓ &nbsp; Open to enrolled students</span><span>♧ &nbsp; Refreshments included</span><span>⌑ &nbsp; {capacity.left} spots remaining</span></div><button className="primary-button full-width" disabled={event.seats_left === 0 && !registered} onClick={onRegister}>{registered ? <><Check size={16} /> Already registered</> : event.seats_left === 0 ? 'Join waitlist' : <><Users size={16} /> Register now — 1-click</>}</button><small className="secure-note"><ShieldCheck size={13} /> Secure student registration</small></div><div className="organizer-card"><span className="organizer-avatar">{event.organizer.slice(0, 1)}</span><div><small>ORGANIZED BY</small><strong>{event.organizer}</strong><span>Verified campus organization</span></div></div><div className="aside-note"><ShieldCheck size={16} /><p>Registration is preview-only and saved in this browser.</p></div></aside>
      </div>
    </main>
  )
}

function StudentDashboard({ events, registrations, onBrowse, onOpen }) {
  return (
    <main className="dashboard-layout app-dashboard">
      <section className="welcome-row"><div><span className="eyebrow">STUDENT DASHBOARD</span><h1>Welcome back, Maya Patel <span>👋</span></h1><p>Undergraduate · Computer Science ’26 · School of Engineering</p></div><button className="primary-button" onClick={onBrowse}>Browse all events <ArrowRight size={15} /></button></section>
      <div className="metric-grid"><Metric icon="✳" value="48" label="Available events this week" /><Metric icon="▣" value={String(registrations.length)} label="My active registrations" /><Metric icon="✧" value="12" label="Attended this term" /><Metric icon="▱" value={String(5 + (registrations.length ? 1 : 0))} label="Saved for later" /></div>
      <div className="dashboard-columns"><section className="panel featured-pass"><div className="panel-heading"><div><span className="eyebrow">CONFIRMED ADMISSION</span><h2>{registrations[0]?.title || events[0]?.title}</h2></div><span className="status-pill">● Upcoming</span></div><div className="pass-preview"><img src={registrations[0]?.image_url || events[0]?.image_url} alt="" /><div><strong>{registrations[0]?.venue || events[0]?.venue}</strong><span><CalendarDays size={14} /> Fri, Nov 15 · 9:00 AM</span><span><MapPin size={14} /> Main Campus · Building 4</span><p>Your student ID is your ticket. Check-in opens 30 minutes before the event.</p></div></div><button className="secondary-button" onClick={() => onOpen(registrations[0] || events[0])}><Ticket size={15} /> View event pass</button></section><aside className="panel quick-rsvp"><span className="eyebrow">QUICK EVENT RSVP</span><h3>Have an invitation code?</h3><p>Enter a campus event code to find and register quickly.</p><div className="code-input"><input placeholder="E.G. CAMPUS-802" /><button onClick={() => onBrowse()}>Find event</button></div></aside></div>
      <HeaderLabel eyebrow="CURATED FOR YOU">Recommended for you</HeaderLabel>
      <div className="event-grid three-col">{events.slice(1, 4).map((event) => <EventCard key={event.id} event={event} onOpen={onOpen} compact />)}</div>
    </main>
  )
}

function Metric({ icon, value, label }) {
  return <article className="metric-card"><span className="metric-icon">{icon}</span><strong>{value}</strong><small>{label}</small></article>
}

function RegistrationsPage({ registrations, onBrowse, onOpen, onCancel }) {
  return (
    <main className="dashboard-layout registrations-page">
      <div className="endpoint-banner"><span><i /> ENDPOINT ACTIVE &nbsp; <code>GET /api/me/registrations</code></span><span>Preview data stored in this browser</span></div>
      <section className="welcome-row"><div><span className="eyebrow">STUDENT TICKETING PORTAL</span><h1>My registrations</h1><p>Manage your registered campus events and keep every attendance pass in one place.</p></div><button className="secondary-button" onClick={onBrowse}><CalendarDays size={15} /> Browse events</button></section>
      <div className="tab-bar"><button className="active">All ({registrations.length})</button><button>Upcoming ({registrations.length})</button><button>Past (0)</button><label><Search size={15} /><input placeholder="Search registered events..." /></label></div>
      {registrations.length ? <div className="registration-list">{registrations.map((event) => <article className="registration-card" key={event.id}><img src={event.image_url} alt="" /><div className="registration-detail"><div className="registration-state"><span className="status-pill"><Check size={13} /> Confirmed RSVP</span><span>ID: {event.confirmation_code}</span><small>Registered {formatDate(event.registered_at)}</small></div><h2>{event.title}</h2><div className="registration-meta"><span><CalendarDays size={14} />{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</span><span><MapPin size={14} />{event.venue}</span></div><div className="registration-actions"><button className="secondary-button" onClick={() => onOpen(event)}><Ticket size={14} /> View event details</button><button className="text-danger" onClick={() => onCancel(event.id)}><X size={14} /> Cancel RSVP</button></div></div></article>)}</div> : <div className="empty-state"><Ticket size={32} /><h3>No registrations yet</h3><p>Find an event that interests you and save your seat.</p><button className="primary-button" onClick={onBrowse}>Explore events <ArrowRight size={15} /></button></div>}
      <div className="metric-grid bottom-metrics"><Metric icon="▣" value={String(registrations.length)} label="Active passes" /><Metric icon="◈" value="0" label="Completed events" /><Metric icon="✧" value="100%" label="Attendance rate" /></div>
    </main>
  )
}

function OrganizerDashboard({ events, onOpenAttendees, onBrowse }) {
  const attendeeCount = events.reduce((sum, event) => sum + getCapacity(event).registered, 0)
  return (
    <main className="dashboard-layout organizer-page">
      <section className="welcome-row organizer-welcome"><div><span className="eyebrow">VERIFIED CHAPTER &nbsp; · &nbsp; FALL 2026</span><h1>Organizer control center</h1><p>Manage published events, monitor capacity, and keep your community up to date.</p></div><div className="button-row"><button className="secondary-button" onClick={onOpenAttendees}><Download size={15} /> Export attendee list</button><button className="primary-button" onClick={onBrowse}><Sparkles size={15} /> Create new event</button></div></section>
      <div className="metric-grid organizer-metrics"><Metric icon="▦" value={String(events.length)} label="Events organized" /><Metric icon="♧" value={attendeeCount.toLocaleString()} label="Registered attendees" /><Metric icon="◴" value="78.2%" label="Average capacity" /><Metric icon="▣" value="24" label="Pending check-ins" /></div>
      <section className="panel directory-panel"><div className="panel-heading"><div><h2>Organized events directory</h2><p>Review event capacity and attendee lists.</p></div><label className="inline-search"><Search size={15} /><input placeholder="Search my events..." /></label></div><div className="organizer-event-list">{events.slice(0, 5).map((event) => { const cap = getCapacity(event); return <article className="organizer-event-row" key={event.id}><img src={event.image_url} alt="" /><div className="organizer-event-info"><span className="status-pill"><i className="live-dot" /> OPEN FOR REGISTRATION</span><h3>{event.title}</h3><span><CalendarDays size={14} /> {formatDate(event.starts_at)} &nbsp; <MapPin size={14} /> {event.venue}</span><div className="capacity-row"><span>Capacity: {cap.registered} / {cap.capacity} registered</span><span>{cap.percent}% filled</span></div><div className="progress-track"><span style={{ width: `${cap.percent}%` }} /></div></div><button className="secondary-button" onClick={onOpenAttendees}><Users size={15} /> View attendees</button><button className="icon-button row-more" aria-label="More event actions"><ArrowUpRight size={16} /></button></article> })}</div></section>
    </main>
  )
}

function AttendeePage({ event, onBack, onExport }) {
  const [checked, setChecked] = useState(() => attendeeSample.filter((attendee) => attendee[4] === 'Checked in').map((attendee) => attendee[3]))
  const [search, setSearch] = useState('')
  const attendees = attendeeSample.filter((attendee) => attendee.slice(0, 3).join(' ').toLowerCase().includes(search.toLowerCase()))
  function toggleCheck(id) {
    setChecked((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  }
  return (
    <main className="dashboard-layout attendee-page">
      <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Organizer dashboard</button>
      <section className="attendee-event panel"><div><span className="eyebrow">{event.category.toUpperCase()} &nbsp;·&nbsp; LIVE REGISTRATION</span><h1>{event.title}</h1><p><CalendarDays size={14} /> {formatDate(event.starts_at)} &nbsp;·&nbsp; <MapPin size={14} /> {event.venue}</p></div><div className="capacity-widget"><strong>{getCapacity(event).registered} <small>/ {getCapacity(event).capacity}</small></strong><span>CAPACITY OCCUPIED</span><div className="progress-track"><span style={{ width: `${getCapacity(event).percent}%` }} /></div></div></section>
      <section className="panel attendee-table-panel"><div className="attendee-toolbar"><label className="inline-search"><Search size={15} /><input value={search} onChange={(input) => setSearch(input.target.value)} placeholder="Search attendees by name or email..." /></label><div className="button-row"><button className="secondary-button" onClick={onExport}><Download size={15} /> Export CSV</button><button className="secondary-button"><Bell size={15} /> Broadcast email</button><button className="primary-button" onClick={() => { const next = attendees.find((attendee) => !checked.includes(attendee[3])); if (next) setChecked((current) => [...current, next[3]]) }}><Check size={15} /> Manual check-in</button></div></div>
        <div className="table-scroll"><table><thead><tr><th>Attendee</th><th>Email address</th><th>Registration date</th><th>Registration ID</th><th>Status</th><th>Actions</th></tr></thead><tbody>{attendees.map(([name, email, date, id, status]) => <tr key={id}><td><div className="attendee-name"><span className="mini-avatar">{name.split(' ').map((part) => part[0]).join('')}</span><strong>{name}</strong></div></td><td>{email}</td><td>{date}</td><td><code>{id}</code></td><td><span className={`status-pill ${checked.includes(id) ? 'checked-in' : ''}`}>{checked.includes(id) ? 'Checked in' : status}</span></td><td><button className="text-button" onClick={() => toggleCheck(id)}>{checked.includes(id) ? 'Undo' : 'Check in'}</button></td></tr>)}</tbody></table></div>
        <div className="table-footer"><span>Showing {attendees.length} of 312 attendees</span><div><button disabled>‹ Previous</button><button className="current">1</button><button disabled>2</button><button disabled>3</button><button disabled>Next ›</button></div></div>
      </section>
      <div className="security-note"><ShieldCheck size={18} /><span><strong>Role-based access preview</strong><small>Attendee tools are design previews. Connect authenticated organizer permissions before using with real attendee data.</small></span></div>
    </main>
  )
}

function Footer({ onNavigate }) {
  return (
    <footer className="site-footer"><div className="footer-main"><div className="footer-brand"><button className="brand" onClick={() => onNavigate('home')}><span className="brand-mark"><CalendarDays size={17} /></span><span>Event<span>Hub</span></span></button><p>The unified collegiate campus engagement platform connecting student organizations, departments, and active campus communities.</p></div><FooterLinks title="Campus discovery" items={['Academic lectures', 'Student clubs & orgs', 'Campus athletics', 'Career & workshops']} /><FooterLinks title="Organizers" items={['Create new event', 'Venue booking', 'Attendee analytics', 'Campus guidelines']} /><FooterLinks title="Resources" items={['Student help desk', 'Security & safety', 'Accessibility services', 'Privacy policy']} /></div><div className="footer-bottom"><span>© 2026 EventHub Collegiate Network. All rights reserved.</span><span>Campus Portal v2.4</span></div></footer>
  )
}

function FooterLinks({ title, items }) {
  return <div className="footer-links"><strong>{title}</strong>{items.map((item) => <span key={item}>{item}</span>)}</div>
}

function AuthDialog({ mode, setMode, onClose, onSubmit, busy }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const isSignup = mode === 'signup'

  function submit(event) {
    event.preventDefault()
    onSubmit({ email: email.trim(), password })
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="dialog-close" onClick={onClose} aria-label="Close sign-in dialog"><X size={18} /></button>
        <span className="brand-mark auth-dialog-mark"><CalendarDays size={19} /></span>
        <span className="eyebrow">YOUR CAMPUS, YOUR EVENTS</span>
        <h2 id="auth-title">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
        <p>Sign in securely with your campus email to register and manage events.</p>
        <form onSubmit={submit}>
          <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@campus.edu" /></label>
          <label>Password<input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /></label>
          <button className="primary-button full-width" type="submit" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
        </form>
        <div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to EventHub?'} <button onClick={() => setMode(isSignup ? 'login' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button></div>
        <small className="auth-disclaimer"><ShieldCheck size={13} /> Credentials are verified by Supabase Auth through the backend.</small>
      </section>
    </div>
  )
}

export default App
