import { db } from './db.js';
import { hashPassword } from './auth.js';

export function seedDatabase(force: boolean = false) {
  // Check if users already exist
  const existingUsersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (existingUsersCount.count > 0 && !force) {
    return;
  }

  console.log('🌱 Seeding database with realistic campus data...');

  if (force) {
    db.exec('DELETE FROM registrations;');
    db.exec('DELETE FROM events;');
    db.exec('DELETE FROM users;');
  }

  const now = new Date().toISOString();

  // 1. Seed Users
  const users = [
    // Organizers
    {
      id: 'usr_org_alex',
      name: 'Alex Rivera',
      email: 'organizer@campusconnect.demo',
      passwordHash: hashPassword('organizer123'),
      role: 'ORGANIZER',
    },
    {
      id: 'usr_org_sarah',
      name: 'Sarah Chen (Tech Societies)',
      email: 'club_lead@campusconnect.demo',
      passwordHash: hashPassword('organizer123'),
      role: 'ORGANIZER',
    },
    // Students
    {
      id: 'usr_stu_jordan',
      name: 'Jordan Hayes',
      email: 'student@campusconnect.demo',
      passwordHash: hashPassword('student123'),
      role: 'STUDENT',
    },
    {
      id: 'usr_stu_maya',
      name: 'Maya Patel',
      email: 'maya@campusconnect.demo',
      passwordHash: hashPassword('student123'),
      role: 'STUDENT',
    },
    {
      id: 'usr_stu_liam',
      name: 'Liam Johnson',
      email: 'liam@campusconnect.demo',
      passwordHash: hashPassword('student123'),
      role: 'STUDENT',
    },
    {
      id: 'usr_stu_elena',
      name: 'Elena Rostova',
      email: 'elena@campusconnect.demo',
      passwordHash: hashPassword('student123'),
      role: 'STUDENT',
    },
    {
      id: 'usr_stu_devon',
      name: 'Devon Miller',
      email: 'devon@campusconnect.demo',
      passwordHash: hashPassword('student123'),
      role: 'STUDENT',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of users) {
    insertUser.run(u.id, u.name, u.email, u.passwordHash, u.role, now, now);
  }

  // 2. Seed Events
  const events = [
    {
      id: 'evt_ai_workshop',
      title: 'AI & Machine Learning Workshop',
      category: 'Technical',
      description: 'A hands-on introduction to machine learning concepts, model training, and practical deployment in modern web applications. Ideal for beginners and intermediate coders.',
      date: '2026-09-28',
      startTime: '10:00 AM',
      endTime: '01:00 PM',
      venue: 'Seminar Hall 2, Science Complex',
      capacity: 50,
      price: 0,
      tags: 'Hands-on, Machine Learning, Certificate',
      status: 'PUBLISHED',
      organizerId: 'usr_org_sarah',
      organizerName: 'AI & Machine Learning Club',
      registrationDeadline: '2026-09-27T23:59:00Z',
    },
    {
      id: 'evt_hackathon',
      title: 'Inter-College Hackathon 2026',
      category: 'Competition',
      description: 'Build impactful campus and civic tech solutions in an intensive 12-hour sprint with mentorship from industry leaders, cash prizes, and sponsor networking.',
      date: '2026-10-05',
      startTime: '09:00 AM',
      endTime: '09:00 PM',
      venue: 'Innovation Hub & Makerspace',
      capacity: 80,
      price: 15,
      tags: 'Prizes, Free Food, Swag, 12-Hour Sprint',
      status: 'PUBLISHED',
      organizerId: 'usr_org_alex',
      organizerName: 'Engineering Student Council',
      registrationDeadline: '2026-10-03T18:00:00Z',
    },
    {
      id: 'evt_photo_walk',
      title: 'Campus Photography Walk & Masterclass',
      category: 'Cultural',
      description: 'Explore campus architecture, natural lighting, and street portraits with award-winning alumni photographers. Bring your DSLR, mirrorless, or phone camera.',
      date: '2026-10-02',
      startTime: '04:00 PM',
      endTime: '06:30 PM',
      venue: 'Arts Courtyard fountain',
      capacity: 4, // Intentionally small so demo exhibits full capacity & waitlist
      price: 0,
      tags: 'Outdoor, Masterclass, Visual Arts',
      status: 'PUBLISHED',
      organizerId: 'usr_org_alex',
      organizerName: 'Visual Arts Society',
      registrationDeadline: '2026-10-01T20:00:00Z',
    },
    {
      id: 'evt_debate_forum',
      title: 'Annual Campus Debate Forum',
      category: 'Club Activity',
      description: 'Parliamentary debate on the ethics of autonomous systems and student governance policies. Audience Q&A and networking reception to follow.',
      date: '2026-10-10',
      startTime: '02:00 PM',
      endTime: '05:00 PM',
      venue: 'Auditorium B, Student Union',
      capacity: 60,
      price: 0,
      tags: 'Networking, Refreshments, Public Speaking',
      status: 'PUBLISHED',
      organizerId: 'usr_org_alex',
      organizerName: 'Debate & Forensic Union',
      registrationDeadline: '2026-10-09T12:00:00Z',
    },
    {
      id: 'evt_basketball_tryouts',
      title: 'Varsity Basketball Tryouts',
      category: 'Sports',
      description: 'Open tryouts for men’s and women’s varsity basketball teams for the 2026-2027 athletic conference season. Appropriate footwear and medical clearance required.',
      date: '2026-10-04',
      startTime: '05:00 PM',
      endTime: '08:00 PM',
      venue: 'Campus Sports Arena, Court 1',
      capacity: 30,
      price: 5,
      tags: 'Athletics, Team Tryout, Jersey Included',
      status: 'PUBLISHED',
      organizerId: 'usr_org_alex',
      organizerName: 'Athletic Department',
      registrationDeadline: '2026-10-03T23:59:00Z',
    },
    {
      id: 'evt_design_sprint',
      title: 'Design Thinking Sprint',
      category: 'Workshop',
      description: 'A 3-hour collaborative workshop tackling student life challenges using human-centered design frameworks, rapid prototyping, and user testing.',
      date: '2026-10-12',
      startTime: '01:00 PM',
      endTime: '04:00 PM',
      venue: 'Design Lab 104, Fine Arts Wing',
      capacity: 35,
      price: 0,
      tags: 'Prototyping, Portfolio Project, Free Snacks',
      status: 'PUBLISHED',
      organizerId: 'usr_org_sarah',
      organizerName: 'Product Design Guild',
      registrationDeadline: '2026-10-11T12:00:00Z',
    },
    {
      id: 'evt_cultural_night',
      title: 'Autumn Cultural Night & Music Fest',
      category: 'Cultural',
      description: 'An evening celebrating campus diversity through traditional musical performances, food stalls, dance troupes, and student acoustic sets under the stars.',
      date: '2026-10-18',
      startTime: '06:00 PM',
      endTime: '10:00 PM',
      venue: 'Open Air Amphitheatre',
      capacity: 250,
      price: 10,
      tags: 'Live Music, Food Stalls, Open Air Fest',
      status: 'PUBLISHED',
      organizerId: 'usr_org_alex',
      organizerName: 'Multicultural Student Alliance',
      registrationDeadline: '2026-10-17T18:00:00Z',
    },
    {
      id: 'evt_resume_workshop',
      title: 'Resume & Interview Strategy Workshop',
      category: 'Seminar',
      description: 'Recruiters from tech, consulting, and research labs critique student resumes in real-time, followed by mock behavioral and technical interview simulations.',
      date: '2026-09-30',
      startTime: '03:00 PM',
      endTime: '04:30 PM',
      venue: 'Career Center, Conference Room 301',
      capacity: 40,
      price: 0,
      tags: 'Career Mentorship, Mock Interviews, 1-on-1',
      status: 'PUBLISHED',
      organizerId: 'usr_org_alex',
      organizerName: 'Career Development Center',
      registrationDeadline: '2026-09-29T17:00:00Z',
    },
    {
      id: 'evt_robotics_rover',
      title: 'Robotics Autonomous Rover Showcase',
      category: 'Technical',
      description: 'Live field demonstrations of student-built planetary rovers, lidar mapping sensors, and robotic arms preparing for national university rover challenge.',
      date: '2026-10-22',
      startTime: '11:00 AM',
      endTime: '02:00 PM',
      venue: 'Engineering Quadrangle & Atrium',
      capacity: 45,
      price: 0,
      tags: 'Robotics, NASA Rover, Live Demos',
      status: 'DRAFT', // Draft event - visible only to organizer!
      organizerId: 'usr_org_alex',
      organizerName: 'Robotics Research Club',
      registrationDeadline: '2026-10-21T12:00:00Z',
    },
    {
      id: 'evt_welcome_carnival',
      title: 'Fall Welcome Carnival 2026',
      category: 'Club Activity',
      description: 'Annual campus orientation carnival with club fair, interactive games, photo booths, and official university merchandise giveaways.',
      date: '2026-09-15',
      startTime: '12:00 PM',
      endTime: '04:00 PM',
      venue: 'Student Union Lawn',
      capacity: 150,
      price: 0,
      tags: 'Games, Free Merch, Campus Life',
      status: 'CLOSED', // Closed event
      organizerId: 'usr_org_alex',
      organizerName: 'Campus Activities Board',
      registrationDeadline: '2026-09-14T23:59:00Z',
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO events (id, title, description, category, date, start_time, end_time, venue, capacity, price, tags, status, organizer_id, organizer_name, registration_deadline, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const e of events) {
    insertEvent.run(
      e.id,
      e.title,
      e.description,
      e.category,
      e.date,
      e.startTime,
      e.endTime,
      e.venue,
      e.capacity,
      e.price,
      e.tags,
      e.status,
      e.organizerId,
      e.organizerName,
      e.registrationDeadline,
      now,
      now
    );
  }

  // 3. Seed Registrations
  // Photo Walk has capacity 4: Maya, Liam, Elena, Devon are confirmed (4/4). Jordan Hayes is waitlisted!
  const registrations = [
    // Confirmed in AI Workshop
    {
      id: 'CC-2026-00010',
      eventId: 'evt_ai_workshop',
      studentId: 'usr_stu_jordan',
      status: 'CONFIRMED',
      registeredAt: '2026-09-20T10:15:00Z',
    },
    {
      id: 'CC-2026-00011',
      eventId: 'evt_ai_workshop',
      studentId: 'usr_stu_maya',
      status: 'CONFIRMED',
      registeredAt: '2026-09-20T10:18:00Z',
    },
    {
      id: 'CC-2026-00012',
      eventId: 'evt_ai_workshop',
      studentId: 'usr_stu_liam',
      status: 'CONFIRMED',
      registeredAt: '2026-09-20T10:22:00Z',
    },

    // Photo Walk (Capacity 4) -> 4 Confirmed, 1 Waitlisted
    {
      id: 'CC-2026-00021',
      eventId: 'evt_photo_walk',
      studentId: 'usr_stu_maya',
      status: 'CONFIRMED',
      registeredAt: '2026-09-21T09:00:00Z',
    },
    {
      id: 'CC-2026-00022',
      eventId: 'evt_photo_walk',
      studentId: 'usr_stu_liam',
      status: 'CONFIRMED',
      registeredAt: '2026-09-21T09:05:00Z',
    },
    {
      id: 'CC-2026-00023',
      eventId: 'evt_photo_walk',
      studentId: 'usr_stu_elena',
      status: 'CONFIRMED',
      registeredAt: '2026-09-21T09:10:00Z',
    },
    {
      id: 'CC-2026-00024',
      eventId: 'evt_photo_walk',
      studentId: 'usr_stu_devon',
      status: 'CONFIRMED',
      registeredAt: '2026-09-21T09:15:00Z',
    },
    // Jordan joined waitlist when it was full
    {
      id: 'CC-2026-00025',
      eventId: 'evt_photo_walk',
      studentId: 'usr_stu_jordan',
      status: 'WAITLISTED',
      registeredAt: '2026-09-21T10:00:00Z',
    },

    // Confirmed in Debate Forum
    {
      id: 'CC-2026-00031',
      eventId: 'evt_debate_forum',
      studentId: 'usr_stu_jordan',
      status: 'CONFIRMED',
      registeredAt: '2026-09-22T14:30:00Z',
    },
    {
      id: 'CC-2026-00032',
      eventId: 'evt_debate_forum',
      studentId: 'usr_stu_elena',
      status: 'CONFIRMED',
      registeredAt: '2026-09-22T14:45:00Z',
    },
  ];

  const insertRegistration = db.prepare(`
    INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const r of registrations) {
    insertRegistration.run(r.id, r.eventId, r.studentId, r.status, r.registeredAt, r.registeredAt);
  }

  console.log('✅ Database seeded successfully with demo users, events, and registrations.');
}
