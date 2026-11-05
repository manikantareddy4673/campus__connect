const photos = {
  hackathon:
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=85',
  ethics:
    'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=85',
  festival:
    'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85',
  workshop:
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=1200&q=85',
  sports:
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=85',
  startup:
    'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=85',
}

export const demoEvents = [
  {
    id: 'e0000000-0000-4000-8000-000000000001',
    title: 'Annual Intercollegiate Hackathon 2025: Build with AI',
    category: 'Technology',
    starts_at: '2026-11-15T09:00:00',
    ends_at: '2026-11-16T18:00:00',
    venue: 'Innovation Lab, Building 4',
    price: 0,
    seats_left: 88,
    capacity: 400,
    image_url: photos.hackathon,
    organizer: 'ACM Student Chapter',
    description:
      'Bring your ideas to life at a campus-wide build sprint. Collaborate with developers, designers, and mentors to create thoughtful tools for the next generation.',
    perks: ['48 hours of building', 'On-site mentors', 'Meals and snacks'],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000002',
    title: 'Ethics in Robotics & Autonomous Systems',
    category: 'Technology',
    starts_at: '2026-11-18T13:30:00',
    ends_at: '2026-11-18T16:30:00',
    venue: 'Vanderbilt Hall, Lecture Room 101',
    price: 0,
    seats_left: 52,
    capacity: 180,
    image_url: photos.ethics,
    organizer: 'Philosophy & AI Society',
    description:
      'A lively afternoon of talks and discussion about responsible robotics, autonomous systems, and the people they serve.',
    perks: ['Guest researchers', 'Audience Q&A', 'Digital certificate'],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000003',
    title: 'Acoustic Lanterns: A Campus Showcase',
    category: 'Arts & Culture',
    starts_at: '2026-11-22T19:30:00',
    ends_at: '2026-11-22T22:00:00',
    venue: 'North Campus Meadow',
    price: 150,
    seats_left: 310,
    capacity: 500,
    image_url: photos.festival,
    organizer: 'Campus Arts Collective',
    description:
      'Celebrate student musicians under the lanterns with an open-air evening of acoustic sets, food, and community.',
    perks: ['Live student bands', 'Food stalls', 'Outdoor seating'],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000004',
    title: 'Biotech Innovators Seminar: Gene Editing in Healthcare',
    category: 'Workshops',
    starts_at: '2026-11-25T14:00:00',
    ends_at: '2026-11-25T17:00:00',
    venue: 'Biomedical Sciences Auditorium',
    price: 99,
    seats_left: 65,
    capacity: 120,
    image_url: photos.workshop,
    organizer: 'Biotech Student Society',
    description:
      'Hear from researchers working at the intersection of gene editing, clinical care, and the future of biotechnology.',
    perks: ['Research talks', 'Career Q&A', 'Networking reception'],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000005',
    title: 'Varsity Homecoming Pep Rally & 3v3 All-Star Tournament',
    category: 'Athletics',
    starts_at: '2026-11-28T18:00:00',
    ends_at: '2026-11-28T22:30:00',
    venue: 'Recreation Fieldhouse Arena Court 1',
    price: 0,
    seats_left: 0,
    capacity: 500,
    image_url: photos.sports,
    organizer: 'Campus Athletics Board',
    description:
      'Get ready for homecoming with a spirited campus pep rally and a fast-paced three-on-three all-star tournament.',
    perks: ['Student performances', 'Team tournament', 'Homecoming giveaways'],
  },
  {
    id: 'e0000000-0000-4000-8000-000000000006',
    title: 'Startup Idea Sprint',
    category: 'Career & Expo',
    starts_at: '2026-12-02T10:00:00',
    ends_at: '2026-12-02T15:00:00',
    venue: 'Innovation Commons',
    price: 50,
    seats_left: 32,
    capacity: 90,
    image_url: photos.startup,
    organizer: 'Campus Founders Club',
    description:
      'Meet a team, test a campus-focused idea, and turn a rough concept into a concise pitch with help from local mentors.',
    perks: ['Team matching', 'Mentor feedback', 'Pitch showcase'],
  },
]

export const categories = [
  'All Events',
  'Technology',
  'Arts & Culture',
  'Career & Expo',
  'Athletics',
  'Workshops',
  'Social',
]

export const categoryCards = [
  { title: 'Technology & Coding', count: '42 upcoming', icon: '⌘', category: 'Technology' },
  { title: 'Arts & Culture', count: '18 upcoming', icon: '◉', category: 'Arts & Culture' },
  { title: 'Career & Networking', count: '30 upcoming', icon: '↗', category: 'Career & Expo' },
  { title: 'Sports & Wellness', count: '23 upcoming', icon: '⌁', category: 'Athletics' },
  { title: 'Academic Workshops', count: '31 upcoming', icon: '▤', category: 'Workshops' },
  { title: 'Greek Life & Socials', count: '24 upcoming', icon: '✳', category: 'Social' },
]
