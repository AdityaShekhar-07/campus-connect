import { Response } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest } from '../auth.js';

export function handleGetOrganizerDashboard(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({
      success: false,
      message: 'Only organizers can access the dashboard.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const organizerId = req.user.id;
  const today = new Date().toISOString().split('T')[0];

  // 1. Total events
  const totalEventsRow = db.prepare(`
    SELECT COUNT(*) as count FROM events WHERE organizer_id = ?
  `).get(organizerId) as { count: number };

  // 2. Published events
  const publishedEventsRow = db.prepare(`
    SELECT COUNT(*) as count FROM events WHERE organizer_id = ? AND status = 'PUBLISHED'
  `).get(organizerId) as { count: number };

  // 3. Total active registrations across organizer's events
  const totalRegsRow = db.prepare(`
    SELECT COUNT(*) as count 
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE e.organizer_id = ? AND r.status IN ('CONFIRMED', 'WAITLISTED')
  `).get(organizerId) as { count: number };

  // 4. Upcoming events
  const upcomingEventsRow = db.prepare(`
    SELECT COUNT(*) as count FROM events 
    WHERE organizer_id = ? AND date >= ? AND status = 'PUBLISHED'
  `).get(organizerId, today) as { count: number };

  // 5. Total Ticket Revenue across organizer's events
  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(r.amount_paid), 0.0) as totalRevenue
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE e.organizer_id = ? AND r.status = 'CONFIRMED'
  `).get(organizerId) as { totalRevenue: number };

  // 6. Recent events with counts and price
  const recentEvents = db.prepare(`
    SELECT 
      e.id, e.title, e.category, e.date, e.start_time as startTime, e.end_time as endTime,
      e.venue, e.capacity, COALESCE(e.price, 0.0) as price, COALESCE(e.tags, '') as tags, e.status,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as confirmedCount,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'WAITLISTED') as waitlistedCount,
      (SELECT COALESCE(SUM(r.amount_paid), 0.0) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as eventRevenue
    FROM events e
    WHERE e.organizer_id = ?
    ORDER BY e.created_at DESC
  `).all(organizerId);

  return res.json({
    success: true,
    stats: {
      totalEvents: totalEventsRow.count,
      publishedEvents: publishedEventsRow.count,
      totalRegistrations: totalRegsRow.count,
      upcomingEvents: upcomingEventsRow.count,
      totalRevenue: revenueRow.totalRevenue,
    },
    events: recentEvents,
  });
}

export function handleGetOrganizerEvents(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({
      success: false,
      message: 'Only organizers can access this resource.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const events = db.prepare(`
    SELECT 
      e.id, e.title, e.category, e.date, e.start_time as startTime, e.end_time as endTime,
      e.venue, e.capacity, COALESCE(e.price, 0.0) as price, COALESCE(e.tags, '') as tags, e.status, e.created_at as createdAt,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as confirmedCount,
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status = 'WAITLISTED') as waitlistedCount,
      (SELECT COALESCE(SUM(r.amount_paid), 0.0) FROM registrations r WHERE r.event_id = e.id AND r.status = 'CONFIRMED') as eventRevenue
    FROM events e
    WHERE e.organizer_id = ?
    ORDER BY e.date DESC, e.start_time ASC
  `).all(req.user.id);

  return res.json({
    success: true,
    events,
  });
}

export function handleGetEventParticipants(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).json({
      success: false,
      message: 'Only organizers can access participants.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const { id: eventId } = req.params;

  // Validate event ownership
  const event = db.prepare(`
    SELECT id, title, capacity, status, date, venue, organizer_id as organizerId
    FROM events
    WHERE id = ?
  `).get(eventId) as {
    id: string;
    title: string;
    capacity: number;
    status: string;
    date: string;
    venue: string;
    organizerId: string;
  } | undefined;

  if (!event) {
    return res.status(404).json({
      success: false,
      message: 'Event not found.',
      code: 'EVENT_NOT_FOUND',
    });
  }

  if (event.organizerId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You can only view participants for your own events.',
      code: 'UNAUTHORIZED_EVENT_OWNER',
    });
  }

  const participants = db.prepare(`
    SELECT 
      r.id as registrationId,
      r.status,
      r.registered_at as registeredAt,
      u.id as studentId,
      u.name as studentName,
      u.email as studentEmail
    FROM registrations r
    JOIN users u ON r.student_id = u.id
    WHERE r.event_id = ? AND r.status != 'CANCELLED'
    ORDER BY 
      CASE WHEN r.status = 'CONFIRMED' THEN 1 ELSE 2 END,
      r.registered_at ASC
  `).all(eventId) as Array<{
    registrationId: string;
    status: 'CONFIRMED' | 'WAITLISTED';
    registeredAt: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
  }>;

  const confirmedCount = participants.filter((p) => p.status === 'CONFIRMED').length;
  const waitlistedCount = participants.filter((p) => p.status === 'WAITLISTED').length;

  return res.json({
    success: true,
    event: {
      id: event.id,
      title: event.title,
      capacity: event.capacity,
      status: event.status,
      date: event.date,
      venue: event.venue,
      confirmedCount,
      waitlistedCount,
    },
    participants,
  });
}

export function handleExportEventParticipants(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'ORGANIZER') {
    return res.status(403).send('Forbidden: Only organizers can export participants.');
  }

  const { id: eventId } = req.params;

  const event = db.prepare(`SELECT id, title, organizer_id FROM events WHERE id = ?`).get(eventId) as {
    id: string;
    title: string;
    organizer_id: string;
  } | undefined;

  if (!event || event.organizer_id !== req.user.id) {
    return res.status(404).send('Event not found or unauthorized.');
  }

  const participants = db.prepare(`
    SELECT 
      r.id as registrationId,
      r.status,
      r.registered_at as registeredAt,
      u.name as studentName,
      u.email as studentEmail
    FROM registrations r
    JOIN users u ON r.student_id = u.id
    WHERE r.event_id = ? AND r.status != 'CANCELLED'
    ORDER BY 
      CASE WHEN r.status = 'CONFIRMED' THEN 1 ELSE 2 END,
      r.registered_at ASC
  `).all(eventId) as Array<{
    registrationId: string;
    status: string;
    registeredAt: string;
    studentName: string;
    studentEmail: string;
  }>;

  // Build CSV
  const header = ['Registration ID', 'Student Name', 'Student Email', 'Status', 'Registered At'];
  const rows = participants.map((p) => [
    `"${p.registrationId}"`,
    `"${p.studentName.replace(/"/g, '""')}"`,
    `"${p.studentEmail.replace(/"/g, '""')}"`,
    `"${p.status}"`,
    `"${p.registeredAt}"`,
  ]);

  const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const safeFilename = `participants_${event.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  return res.status(200).send(csvContent);
}
