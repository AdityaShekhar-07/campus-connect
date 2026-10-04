import { Response } from 'express';
import crypto from 'node:crypto';
import { db, runTransaction } from '../db.js';
import { AuthenticatedRequest } from '../auth.js';

function generateUniqueRegistrationId(): string {
  while (true) {
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const candidateId = `CC-2026-${ts}-${randomHex}`;
    const exists = db.prepare('SELECT 1 FROM registrations WHERE id = ?').get(candidateId);
    if (!exists) {
      return candidateId;
    }
  }
}

export function handleRegisterForEvent(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Only students can register for events.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const { id: eventId } = req.params;

  try {
    const result = runTransaction(() => {
      // 1. Fetch event
      const event = db.prepare(`
        SELECT id, title, capacity, COALESCE(price, 0.0) as price, status, registration_deadline as registrationDeadline, date, start_time as startTime, venue
        FROM events
        WHERE id = ?
      `).get(eventId) as {
        id: string;
        title: string;
        capacity: number;
        price: number;
        status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
        registrationDeadline: string | null;
        date: string;
        startTime: string;
        venue: string;
      } | undefined;

      if (!event) {
        return {
          statusCode: 404,
          data: {
            success: false,
            message: 'Event not found.',
            code: 'EVENT_NOT_FOUND',
          },
        };
      }

      if (event.status === 'DRAFT') {
        return {
          statusCode: 400,
          data: {
            success: false,
            message: 'This event is not yet published.',
            code: 'EVENT_DRAFT',
          },
        };
      }

      if (event.status === 'CLOSED') {
        return {
          statusCode: 400,
          data: {
            success: false,
            message: 'Registration is closed for this event.',
            code: 'EVENT_CLOSED',
          },
        };
      }

      // 2. Check existing active registration
      const existingReg = db.prepare(`
        SELECT id, status
        FROM registrations
        WHERE event_id = ? AND student_id = ? AND status != 'CANCELLED'
      `).get(eventId, req.user!.id) as { id: string; status: 'CONFIRMED' | 'WAITLISTED' } | undefined;

      if (existingReg) {
        return {
          statusCode: 409,
          data: {
            success: false,
            message: existingReg.status === 'CONFIRMED'
              ? 'You are already registered for this event.'
              : 'You are already on the waitlist for this event.',
            code: 'ALREADY_REGISTERED',
            currentStatus: existingReg.status,
          },
        };
      }

      // Clean up any prior cancelled registration record for this event and user
      db.prepare(`
        DELETE FROM registrations
        WHERE event_id = ? AND student_id = ? AND status = 'CANCELLED'
      `).run(eventId, req.user!.id);

      // 3. Count current confirmed registrations
      const countRow = db.prepare(`
        SELECT COUNT(*) as confirmedCount
        FROM registrations
        WHERE event_id = ? AND status = 'CONFIRMED'
      `).get(eventId) as { confirmedCount: number };

      const confirmedCount = countRow.confirmedCount;
      const status: 'CONFIRMED' | 'WAITLISTED' = confirmedCount < event.capacity ? 'CONFIRMED' : 'WAITLISTED';

      // 4. Generate guaranteed unique Registration ID e.g. CC-2026-X8Y1-A3C9
      const registrationId = generateUniqueRegistrationId();
      const now = new Date().toISOString();
      const amountPaid = event.price > 0 && status === 'CONFIRMED' ? event.price : 0;
      const paymentStatus = event.price > 0 ? (status === 'CONFIRMED' ? 'PAID' : 'PENDING') : 'FREE';

      db.prepare(`
        INSERT INTO registrations (id, event_id, student_id, status, amount_paid, payment_status, registered_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(registrationId, eventId, req.user!.id, status, amountPaid, paymentStatus, now, now);

      return {
        statusCode: 201,
        data: {
          success: true,
          message: status === 'CONFIRMED'
            ? (event.price > 0 ? `Registration confirmed! Ticket of $${event.price.toFixed(2)} issued.` : 'Registration confirmed!')
            : 'Event is full. You have been added to the waitlist.',
          status,
          registration: {
            id: registrationId,
            eventId,
            eventTitle: event.title,
            eventDate: event.date,
            eventVenue: event.venue,
            price: event.price,
            amountPaid,
            paymentStatus,
            status,
            registeredAt: now,
          },
        },
      };
    });

    return res.status(result.statusCode).json(result.data);
  } catch (error: any) {
    console.error('Registration transaction failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while registering. Please try again.',
      code: 'REGISTRATION_FAILED',
    });
  }
}

export function handleGetMyRegistrations(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Only students can view registrations.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const registrations = db.prepare(`
    SELECT 
      r.id, r.event_id as eventId, r.status, r.registered_at as registeredAt, r.updated_at as updatedAt,
      COALESCE(r.amount_paid, 0.0) as amountPaid,
      COALESCE(r.payment_status, 'FREE') as paymentStatus,
      COALESCE(e.price, 0.0) as price,
      COALESCE(e.tags, '') as tags,
      e.title as eventTitle, e.category, e.date as eventDate, 
      e.start_time as startTime, e.end_time as endTime, 
      e.venue as eventVenue, e.capacity, e.status as eventStatus, 
      e.organizer_name as organizerName,
      (SELECT COUNT(*) FROM registrations sub WHERE sub.event_id = e.id AND sub.status = 'CONFIRMED') as confirmedCount,
      (SELECT COUNT(*) FROM registrations sub WHERE sub.event_id = e.id AND sub.status = 'WAITLISTED') as waitlistedCount
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    WHERE r.student_id = ?
    ORDER BY e.date ASC, e.start_time ASC
  `).all(req.user.id) as Array<{
    id: string;
    eventId: string;
    status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
    registeredAt: string;
    updatedAt: string;
    amountPaid: number;
    paymentStatus: 'FREE' | 'PAID' | 'REFUNDED';
    price: number;
    tags: string;
    eventTitle: string;
    category: string;
    eventDate: string;
    startTime: string;
    endTime: string;
    eventVenue: string;
    capacity: number;
    eventStatus: string;
    organizerName: string;
    confirmedCount: number;
    waitlistedCount: number;
  }>;

  const formatted = registrations.map((r) => ({
    ...r,
    tags: r.tags ? r.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  }));

  const today = new Date().toISOString().split('T')[0];

  const upcoming = formatted.filter(
    (r) => r.eventDate >= today && r.status !== 'CANCELLED'
  );
  const past = formatted.filter(
    (r) => r.eventDate < today || r.status === 'CANCELLED'
  );

  return res.json({
    success: true,
    upcoming,
    past,
    all: formatted,
  });
}

export function handleCancelRegistration(req: AuthenticatedRequest, res: Response) {
  if (!req.user || req.user.role !== 'STUDENT') {
    return res.status(403).json({
      success: false,
      message: 'Only students can cancel their registration.',
      code: 'UNAUTHORIZED_ROLE',
    });
  }

  const { id: registrationId } = req.params;

  try {
    const result = runTransaction(() => {
      // 1. Fetch registration
      const reg = db.prepare(`
        SELECT id, event_id as eventId, student_id as studentId, status
        FROM registrations
        WHERE id = ?
      `).get(registrationId) as {
        id: string;
        eventId: string;
        studentId: string;
        status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
      } | undefined;

      if (!reg) {
        return {
          statusCode: 404,
          data: {
            success: false,
            message: 'Registration not found.',
            code: 'REGISTRATION_NOT_FOUND',
          },
        };
      }

      if (reg.studentId !== req.user!.id) {
        return {
          statusCode: 403,
          data: {
            success: false,
            message: 'You can only cancel your own registrations.',
            code: 'UNAUTHORIZED_REGISTRATION_OWNER',
          },
        };
      }

      if (reg.status === 'CANCELLED') {
        return {
          statusCode: 400,
          data: {
            success: false,
            message: 'This registration has already been cancelled.',
            code: 'ALREADY_CANCELLED',
          },
        };
      }

      const now = new Date().toISOString();

      // 2. Mark this registration as CANCELLED
      db.prepare(`
        UPDATE registrations
        SET status = 'CANCELLED', updated_at = ?
        WHERE id = ?
      `).run(now, registrationId);

      let waitlistPromoted = false;
      let promotedRegistrationId: string | null = null;

      // 3. If the cancelled registration was CONFIRMED, promote the first waitlisted student (deterministic FIFO)
      if (reg.status === 'CONFIRMED') {
        const nextInLine = db.prepare(`
          SELECT id, student_id as studentId
          FROM registrations
          WHERE event_id = ? AND status = 'WAITLISTED'
          ORDER BY registered_at ASC
          LIMIT 1
        `).get(reg.eventId) as { id: string; studentId: string } | undefined;

        if (nextInLine) {
          db.prepare(`
            UPDATE registrations
            SET status = 'CONFIRMED', updated_at = ?
            WHERE id = ?
          `).run(now, nextInLine.id);

          waitlistPromoted = true;
          promotedRegistrationId = nextInLine.id;
        }
      }

      // Return fresh event stats
      const counts = db.prepare(`
        SELECT 
          SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmedCount,
          SUM(CASE WHEN status = 'WAITLISTED' THEN 1 ELSE 0 END) as waitlistedCount
        FROM registrations
        WHERE event_id = ?
      `).get(reg.eventId) as { confirmedCount: number | null; waitlistedCount: number | null };

      return {
        statusCode: 200,
        data: {
          success: true,
          message: 'Registration cancelled successfully.',
          waitlistPromoted,
          promotedRegistrationId,
          confirmedCount: counts.confirmedCount || 0,
          waitlistedCount: counts.waitlistedCount || 0,
        },
      };
    });

    return res.status(result.statusCode).json(result.data);
  } catch (error: any) {
    console.error('Cancellation transaction failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while cancelling your registration.',
      code: 'CANCELLATION_FAILED',
    });
  }
}
