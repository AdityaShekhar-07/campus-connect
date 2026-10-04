export type Role = 'STUDENT' | 'ORGANIZER';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED';

export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface EventItem {
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
  tags?: string[];
  status: EventStatus;
  organizerId: string;
  organizerName: string;
  registrationDeadline?: string | null;
  createdAt: string;
  updatedAt?: string;
  confirmedCount: number;
  waitlistedCount: number;
  availableSeats: number;
  isFull: boolean;
  isSaved?: boolean;
  userRegistration?: {
    status: RegistrationStatus;
    id: string;
    amountPaid?: number;
    paymentStatus?: 'FREE' | 'PAID' | 'REFUNDED';
  } | null;
}

export interface RegistrationItem {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  registeredAt: string;
  updatedAt: string;
  eventTitle: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  eventVenue: string;
  capacity: number;
  price: number;
  tags?: string[];
  eventStatus: EventStatus;
  organizerName: string;
  confirmedCount: number;
  waitlistedCount: number;
  amountPaid?: number;
  paymentStatus?: 'FREE' | 'PAID' | 'REFUNDED';
}

export interface DashboardStats {
  totalEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
  upcomingEvents: number;
  totalRevenue: number;
}

export interface ParticipantItem {
  registrationId: string;
  status: 'CONFIRMED' | 'WAITLISTED';
  registeredAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
}

export const EVENT_CATEGORIES = [
  'All',
  'Technical',
  'Cultural',
  'Sports',
  'Workshop',
  'Seminar',
  'Competition',
  'Club Activity',
  'Other',
] as const;
