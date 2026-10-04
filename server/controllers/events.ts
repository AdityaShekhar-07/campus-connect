import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../auth.js';

export const VALID_CATEGORIES = [
  'Technical',
  'Cultural',
  'Sports',
  'Workshop',
  'Seminar',
  'Competition',
  'Club Activity',
  'Other',
];

interface EventRow {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  capacity: number;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  organizer_id: string;
  organizer_name: string;
  registration_deadline: string | null;
  created_at: string;
  updated_at: string;
}

export function handleGetEvents(req: AuthenticatedRequest, res: Response) {
  const { search, category, dateFilter, availability, sort, priceFilter, savedOnly } = req.query;

  // Base query: only published and closed events for general discovery
  let sql = `
    SELECT 
      e.id, e.title, e.description, e.category, e.date, 
      e.start_time as startTime, e.end_time as endTime, 
      e.venue, e.capacity, e.status, 
      COALESCE(e.price, 0.0) as price,
      COALESCE(e.tags, '') as tags,
      e.organizer_id as organizerId, e.organizer_name as organizerName, 
      e.registration_deadline as registrationDeadline,
      e.created_at as createdAt,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as confirmedCount,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'WAITLISTED') as waitlistedCount
    FROM events e
    WHERE e.status IN ('PUBLISHED', 'CLOSED')
  `;

  const params: (string | number)[] = [];

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim()}%`;
    sql += ` AND (e.title LIKE ? OR e.description LIKE ? OR e.organizer_name LIKE ? OR e.venue LIKE ? OR e.tags LIKE ?)`;
    params.push(term, term, term, term, term);
  }

  if (category && typeof category === 'string' && category !== 'All') {
    sql += ` AND e.category = ?`;
    params.push(category);
  }

  if (priceFilter === 'free') {
    sql += ` AND (e.price IS NULL OR e.price = 0)`;
  } else if (priceFilter === 'paid') {
    sql += ` AND e.price > 0`;
  }

  if (dateFilter && typeof dateFilter === 'string') {
    const today = new Date().toISOString().split('T')[0];
    if (dateFilter === 'upcoming') {
      sql += ` AND e.date >= ?`;
      params.push(today);
    } else if (dateFilter === 'today') {
      sql += ` AND e.date = ?`;
      params.push(today);
    } else if (dateFilter === 'this_week') {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      sql += ` AND e.date >= ? AND e.date <= ?`;
      params.push(today, nextWeek);
    }
  }

  // Sort
  if (sort === 'newest') {
    sql += ` ORDER BY e.created_at DESC`;
  } else if (sort === 'most_available') {
    sql += ` ORDER BY (e.capacity - (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED')) DESC, e.date ASC`;
  } else if (sort === 'price_asc') {
    sql += ` ORDER BY COALESCE(e.price, 0) ASC, e.date ASC`;
  } else if (sort === 'price_desc') {
    sql += ` ORDER BY COALESCE(e.price, 0) DESC, e.date ASC`;
  } else {
    // Default: soonest
    sql += ` ORDER BY e.date ASC, e.start_time ASC`;
  }

  const events = db.prepare(sql).all(...params) as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    capacity: number;
    price: number;
    tags: string;
    status: 'PUBLISHED' | 'CLOSED';
    organizerId: string;
    organizerName: string;
    registrationDeadline: string | null;
    createdAt: string;
    confirmedCount: number;
    waitlistedCount: number;
  }>;

  // If user is authenticated as student, attach their registration status and saved bookmark status
  let userRegistrationsMap = new Map<string, { status: string; id: string; amountPaid?: number; paymentStatus?: string }>();
  let userSavedEventsSet = new Set<string>();

  if (req.user && req.user.role === 'STUDENT') {
    const userRegs = db.prepare(`
      SELECT event_id, status, id, amount_paid as amountPaid, payment_status as paymentStatus
      FROM registrations
      WHERE student_id = ? AND status != 'CANCELLED'
    `).all(req.user.id) as Array<{ event_id: string; status: string; id: string; amountPaid?: number; paymentStatus?: string }>;
    for (const r of userRegs) {
      userRegistrationsMap.set(r.event_id, {
        status: r.status,
        id: r.id,
        amountPaid: r.amountPaid,
        paymentStatus: r.paymentStatus,
      });
    }

    const saved = db.prepare(`
      SELECT event_id FROM saved_events WHERE student_id = ?
    `).all(req.user.id) as Array<{ event_id: string }>;
    for (const s of saved) {
      userSavedEventsSet.add(s.event_id);
    }
  }

  let formatted = events.map((e) => {
    const availableSeats = Math.max(0, e.capacity - e.confirmedCount);
    const userReg = userRegistrationsMap.get(e.id);
    const tagList = e.tags ? e.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

    return {
      ...e,
      price: Number(e.price) || 0,
      tags: tagList,
      isSaved: userSavedEventsSet.has(e.id),
      availableSeats,
      isFull: availableSeats === 0,
      userRegistration: userReg
        ? {
            status: userReg.status,
            id: userReg.id,
            amountPaid: userReg.amountPaid,
            paymentStatus: userReg.paymentStatus,
          }
        : null,
    };
  });

  // Saved only filter
  if (savedOnly === 'true') {
    formatted = formatted.filter((e) => e.isSaved);
  }

  // Availability filter in memory if specified
  if (availability === 'available') {
    formatted = formatted.filter((e) => e.status === 'PUBLISHED' && e.availableSeats > 0);
  } else if (availability === 'full') {
    formatted = formatted.filter((e) => e.status === 'PUBLISHED' && e.availableSeats === 0);
  }

  return res.json({
    success: true,
    events: formatted,
    count: formatted.length,
  });
}

export function handleGetEventById(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;

  const event = db.prepare(`
    SELECT 
      id, title, description, category, date, 
      start_time as startTime, end_time as endTime, 
      venue, capacity, status, 
      COALESCE(price, 0.0) as price,
      COALESCE(tags, '') as tags,
      organizer_id as organizerId, organizer_name as organizerName, 
      registration_deadline as registrationDeadline,
      created_at as createdAt, updated_at as updatedAt
    FROM events
    WHERE id = ?
  `).get(id) as {
    id: string;
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    capacity: number;
    price: number;
    tags: string;
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    organizerId: string;
    organizerName: string;
    registrationDeadline: string | null;
    createdAt: string;
    updatedAt: string;
  } | undefined;

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found.',
      code: 'EVENT_NOT_FOUND',
    });
  }

  // If event is DRAFT, only the organizer owner can view it
  if (event.status === 'DRAFT') {
    if (!req.user || req.user.id !== event.organizerId) {
      return res.status(403).json({
        success: false,
        message: 'This event draft is not accessible.',
        code: 'DRAFT_NOT_ACCESSIBLE',
      });
    }
  }

  // Counts
  const counts = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedCount,
      SUM(CASE WHEN status = 'WAITLISTED' THEN 1 ELSE 0 END) as waitlistedCount
    FROM registrations
    WHERE event_id = ?
  `).get(id) as { confirmedCount: number | null; waitlistedCount: number | null };

  const confirmedCount = counts.confirmedCount || 0;
  const waitlistedCount = counts.waitlistedCount || 0;
  const availableSeats = Math.max(0, event.capacity - confirmedCount);

  // Check if authenticated user has a registration
  let userRegistration: { id: string; status: string; registeredAt: string; amountPaid?: number; paymentStatus?: string } | null = null;
  let isSaved = false;

  if (req.user && req.user.role === 'STUDENT') {
    const reg = db.prepare(`
      SELECT id, status, registered_at as registeredAt, amount_paid as amountPaid, payment_status as paymentStatus
      FROM registrations
      WHERE event_id = ? AND student_id = ? AND status != 'CANCELLED'
    `).get(id, req.user.id) as { id: string; status: string; registeredAt: string; amountPaid?: number; paymentStatus?: string } | undefined;
    if (reg) {
      userRegistration = reg;
    }

    const saved = db.prepare(`
      SELECT 1 FROM saved_events WHERE student_id = ? AND event_id = ?
    `).get(req.user.id, id);
    isSaved = Boolean(saved);
  }

  const tagList = event.tags ? event.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

  return res.json({
    success: true,
    event: {
      ...event,
      price: Number(event.price) || 0,
      tags: tagList,
      isSaved,
      confirmedCount,
      waitlistedCount,
      availableSeats,
      isFull: availableSeats === 0,
      userRegistration,
    },
  });
}

export function handleToggleSaveEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Only students can bookmark events.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const { id: eventId } = req.params;
  const existing = db.prepare(`
    SELECT 1 FROM saved_events WHERE student_id = ? AND event_id = ?
  `).get(req.user.id, eventId);

  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      DELETE FROM saved_events WHERE student_id = ? AND event_id = ?
    `).run(req.user.id, eventId);

    return res.json({
      success: true,
      isSaved: false,
      message: 'Event removed from bookmarks.',
    });
  } else {
    db.prepare(`
      INSERT INTO saved_events (student_id, event_id, created_at)
      VALUES (?, ?, ?)
    `).run(req.user.id, eventId, now);

    return res.json({
      success: true,
      isSaved: true,
      message: 'Event bookmarked successfully!',
    });
  }
}

export function handleCreateEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({
      success: false,
      message: 'Only organizers can create events.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const {
    title,
    description,
    category,
    date,
    startTime,
    endTime,
    venue,
    capacity,
    price = 0,
    tags = '',
    status = 'DRAFT',
    organizerName,
    registrationDeadline,
  } = req.body;

  // Validation
  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Event title is required.', code: 'INVALID_TITLE' });
  }
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: 'Valid category is required.', code: 'INVALID_CATEGORY' });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, message: 'Description is required.', code: 'INVALID_DESCRIPTION' });
  }
  if (!date) {
    return res.status(400).json({ success: false, message: 'Date is required.', code: 'INVALID_DATE' });
  }
  if (!startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'Start and end times are required.', code: 'INVALID_TIME' });
  }
  if (!venue || !venue.trim()) {
    return res.status(400).json({ success: false, message: 'Venue is required.', code: 'INVALID_VENUE' });
  }
  const cap = Number(capacity);
  if (isNaN(cap) || cap <= 0) {
    return res.status(400).json({ success: false, message: 'Capacity must be greater than zero.', code: 'INVALID_CAPACITY' });
  }
  const priceNum = Math.max(0, Number(price) || 0);

  if (!['DRAFT', 'PUBLISHED'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be DRAFT or PUBLISHED.', code: 'INVALID_STATUS' });
  }

  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const orgName = (organizerName && organizerName.trim()) ? organizerName.trim() : req.user.name;
  const tagString = Array.isArray(tags) ? tags.join(', ') : (typeof tags === 'string' ? tags : '');

  db.prepare(`
    INSERT INTO events (
      id, title, description, category, date, start_time, end_time,
      venue, capacity, price, tags, status, organizer_id, organizer_name,
      registration_deadline, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    title.trim(),
    description.trim(),
    category,
    date,
    startTime.trim(),
    endTime.trim(),
    venue.trim(),
    cap,
    priceNum,
    tagString,
    status,
    req.user.id,
    orgName,
    registrationDeadline || null,
    now,
    now
  );

  return res.status(201).json({
    success: true,
    message: status === 'PUBLISHED' ? 'Event published successfully.' : 'Event draft saved successfully.',
    eventId,
  });
}

export function handleUpdateEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({
      success: false,
      message: 'Only organizers can edit events.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const { id } = req.params;
  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as any;

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.', code: 'EVENT_NOT_FOUND' });
  }

  if (event.organizer_id !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only edit events that you created.',
      code: 'UNAUTHORIZED_EVENT_OWNER',
    });
  }

  if (event.status === 'CLOSED') {
    return res.status(400).json({
      success: false,
      message: 'Closed events cannot be edited.',
      code: 'EVENT_CLOSED',
    });
  }

  const {
    title,
    description,
    category,
    date,
    startTime,
    endTime,
    venue,
    capacity,
    price,
    tags,
    organizerName,
    registrationDeadline,
  } = req.body;

  // Validate
  if (title !== undefined && !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title cannot be empty.', code: 'INVALID_TITLE' });
  }
  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: 'Invalid category.', code: 'INVALID_CATEGORY' });
  }

  let newCapacity = event.capacity;
  if (capacity !== undefined) {
    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum <= 0) {
      return res.status(400).json({ success: false, message: 'Capacity must be greater than zero.', code: 'INVALID_CAPACITY' });
    }

    // Safety rule: Never allow confirmed registrations to silently exceed capacity.
    const confirmedRow = db.prepare(`
      SELECT COUNT(*) as count FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'
    `).get(id) as { count: number };

    if (capNum < confirmedRow.count) {
      return res.status(400).json({
        success: false,
        message: 'Capacity cannot be reduced below the current number of confirmed registrations.',
        code: 'CAPACITY_BELOW_CONFIRMED',
      });
    }

    newCapacity = capNum;
  }

  const newPrice = price !== undefined ? Math.max(0, Number(price) || 0) : event.price;
  const newTags = tags !== undefined
    ? (Array.isArray(tags) ? tags.join(', ') : String(tags))
    : event.tags;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE events SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      date = COALESCE(?, date),
      start_time = COALESCE(?, start_time),
      end_time = COALESCE(?, end_time),
      venue = COALESCE(?, venue),
      capacity = ?,
      price = ?,
      tags = ?,
      organizer_name = COALESCE(?, organizer_name),
      registration_deadline = ?,
      updated_at = ?
    WHERE id = ?
  `).run(
    title ? title.trim() : null,
    description ? description.trim() : null,
    category || null,
    date || null,
    startTime ? startTime.trim() : null,
    endTime ? endTime.trim() : null,
    venue ? venue.trim() : null,
    newCapacity,
    newPrice,
    newTags,
    organizerName ? organizerName.trim() : null,
    registrationDeadline !== undefined ? registrationDeadline : event.registration_deadline,
    now,
    id
  );

  return res.json({
    success: true,
    message: 'Event updated successfully.',
  });
}

export function handlePublishEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({ success: false, message: 'Only organizers can publish events.', code: 'UNAUTHORIZED_ROLE' });
  }

  const { id } = req.params;
  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as EventRow | undefined;

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.', code: 'EVENT_NOT_FOUND' });
  }

  if (event.organizer_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only publish your own events.', code: 'UNAUTHORIZED_EVENT_OWNER' });
  }

  // Validate completeness
  if (!event.title || !event.date || !event.start_time || !event.venue || event.capacity <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot publish event with incomplete details.',
      code: 'INCOMPLETE_EVENT',
    });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE events SET status = 'PUBLISHED', updated_at = ? WHERE id = ?`).run(now, id);

  return res.json({
    success: true,
    message: 'Event published successfully. Students can now view and register.',
  });
}

export function handleCloseEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({ success: false, message: 'Only organizers can close events.', code: 'UNAUTHORIZED_ROLE' });
  }

  const { id } = req.params;
  const event = db.prepare(`SELECT * FROM events WHERE id = ?`).get(id) as EventRow | undefined;

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.', code: 'EVENT_NOT_FOUND' });
  }

  if (event.organizer_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only close your own events.', code: 'UNAUTHORIZED_EVENT_OWNER' });
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE events SET status = 'CLOSED', updated_at = ? WHERE id = ?`).run(now, id);

  return res.json({
    success: true,
    message: 'Event closed successfully. No new registrations will be accepted.',
  });
}
