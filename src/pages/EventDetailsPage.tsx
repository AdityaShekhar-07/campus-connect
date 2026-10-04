import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Share2,
  ExternalLink,
  CalendarPlus,
  QrCode,
  Copy,
  CreditCard,
  Tag,
} from 'lucide-react';
import { api } from '../lib/api';
import { EventItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SeatAvailability } from '../components/common/SeatAvailability';
import { EventStatusBadge } from '../components/common/EventStatusBadge';
import { RegistrationStatusBadge } from '../components/common/RegistrationStatusBadge';
import { formatEventDate } from '../components/common/EventCard';
import { Skeleton } from '../components/common/Skeleton';
import { Modal } from '../components/common/Modal';

function downloadCalendarInvite(event: EventItem) {
  try {
    const [year, month, day] = event.date.split('-').map(Number);
    const startDateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T100000Z`;
    const endDateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T130000Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CampusConnect//Event Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description.replace(/\n/g, ' ')}`,
      `LOCATION:${event.venue}`,
      `DTSTART:${startDateStr}`,
      `DTEND:${endDateStr}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (_) {}
}

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated, isStudent, isOrganizer } = useAuth();
  const { success, error: toastError } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Post-registration confirmation modal state
  const [confirmedRegistration, setConfirmedRegistration] = useState<{
    id: string;
    status: 'CONFIRMED' | 'WAITLISTED';
    eventTitle: string;
    eventDate: string;
    eventVenue: string;
  } | null>(null);

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await api.getEventById(id);
        if (res.success) {
          setEvent(res.event);
        }
      } catch (err: any) {
        setError(err.message || 'Event not found or inaccessible.');
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }

    if (!isStudent) {
      toastError('Only student accounts can register for campus events. Switch to Student in navigation.');
      return;
    }

    if (!event) return;

    setRegistering(true);
    try {
      const res = await api.registerForEvent(event.id);
      if (res.success) {
        // Update local event state
        setEvent((prev) => {
          if (!prev) return prev;
          const isConfirmed = res.status === 'CONFIRMED';
          const newConfirmed = isConfirmed ? prev.confirmedCount + 1 : prev.confirmedCount;
          const newWaitlisted = !isConfirmed ? prev.waitlistedCount + 1 : prev.waitlistedCount;
          return {
            ...prev,
            confirmedCount: newConfirmed,
            waitlistedCount: newWaitlisted,
            availableSeats: Math.max(0, prev.capacity - newConfirmed),
            userRegistration: {
              status: res.status,
              id: res.registration.id,
            },
          };
        });

        setConfirmedRegistration({
          id: res.registration.id,
          status: res.status,
          eventTitle: event.title,
          eventDate: event.date,
          eventVenue: event.venue,
        });

        if (res.status === 'CONFIRMED') {
          success('Registration confirmed!');
        } else {
          success('Added to waitlist. You will be promoted if a seat opens.');
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Registration failed. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Event Not Available</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'This event could not be found.'}</p>
        <Link
          to="/events"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to events</span>
        </Link>
      </div>
    );
  }

  const isClosed = event.status === 'CLOSED';
  const isFull = event.availableSeats === 0;
  const userRegistration = event.userRegistration;
  const isRegistered = Boolean(userRegistration);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb / Back button */}
      <div className="mb-6">
        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to all events</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Event Content (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                {event.category}
              </span>
              <EventStatusBadge status={event.status} size="sm" />
              {userRegistration && (
                <RegistrationStatusBadge status={userRegistration.status} size="sm" />
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-snug">
              {event.title}
            </h1>

            <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-2">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Organized by <strong className="font-semibold text-slate-900">{event.organizerName}</strong></span>
            </div>
          </div>

          {/* Quick Schedule Grid */}
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Date</div>
                <div className="text-xs font-medium text-slate-900 mt-0.5">{formatEventDate(event.date)}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Time</div>
                <div className="text-xs font-medium text-slate-900 mt-0.5">{event.startTime} – {event.endTime}</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase">Venue</div>
                <div className="text-xs font-medium text-slate-900 mt-0.5 truncate">{event.venue}</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2">
            <h2 className="text-base font-semibold text-slate-900 mb-3">About this event</h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
              {event.description}
            </div>
          </div>

          {/* Organizer Note */}
          {isOrganizer && user?.id === event.organizerId && (
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-purple-900">Organizer Controls</div>
                <div className="text-xs text-purple-700">You are the creator of this campus event.</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/organizer/events/${event.id}/participants`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-purple-200 text-purple-900 hover:bg-purple-100"
                >
                  View Participants
                </Link>
                <Link
                  to={`/organizer/events/${event.id}/edit`}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-900 text-white hover:bg-purple-800"
                >
                  Edit Event
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar / Registration CTA Card (Right col) */}
        <div className="space-y-4">
          <div className="sticky top-20 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            {/* Price Row */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admission</span>
              <div>
                {!event.price || event.price === 0 ? (
                  <span className="px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    FREE ADMISSION
                  </span>
                ) : (
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">${event.price.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block font-normal">per student attendee</span>
                  </div>
                )}
              </div>
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Seat Capacity
            </h3>

            {/* Seat Availability Bar */}
            <div className="space-y-2">
              <SeatAvailability
                capacity={event.capacity}
                confirmedCount={event.confirmedCount}
                waitlistedCount={event.waitlistedCount}
                showBar={true}
              />
            </div>

            {/* Registration state actions */}
            {isClosed ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
                <div className="font-semibold text-slate-800 mb-1">Registration is Closed</div>
                <p>This event is no longer accepting new registrations or waitlist submissions.</p>
              </div>
            ) : isRegistered ? (
              <div className="p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-xs space-y-3">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm">
                    {userRegistration?.status === 'CONFIRMED'
                      ? 'You are registered!'
                      : 'You are on the waitlist'}
                  </span>
                </div>
                <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200/60 space-y-1 font-mono text-[11px] text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Pass ID:</span>
                    <span className="font-semibold">{userRegistration?.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Ticket:</span>
                    <span className="font-semibold text-emerald-800">
                      {!event.price || event.price === 0 ? 'Free Pass' : `Paid ($${event.price.toFixed(2)})`}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  {userRegistration?.status === 'CONFIRMED'
                    ? 'Your pass is confirmed. Present your Pass ID at the venue door.'
                    : 'If an active attendee cancels, you will automatically be promoted to confirmed.'}
                </p>
                <div className="pt-2 border-t border-emerald-200 flex items-center justify-between">
                  <Link
                    to="/registrations"
                    className="text-xs font-semibold text-emerald-900 hover:text-emerald-950 underline"
                  >
                    View in My Registrations &rarr;
                  </Link>
                  <button
                    type="button"
                    onClick={() => downloadCalendarInvite(event)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 hover:text-emerald-950"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>.ics</span>
                  </button>
                </div>
              </div>
            ) : isFull ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>This event is currently full.</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-normal">
                    Join the waitlist to be automatically promoted if a confirmed participant cancels their seat.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500/30 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {registering ? (
                    <>
                      <span className="w-4 h-4 border-2 border-amber-900/30 border-t-amber-900 rounded-full animate-spin" />
                      <span>Joining waitlist...</span>
                    </>
                  ) : (
                    <span>Join waitlist</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-600">
                  <span>Seats are available on a first-come, first-served basis.</span>
                </div>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {registering ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>
                      {!event.price || event.price === 0
                        ? 'Register Free'
                        : `Register & Pay $${event.price.toFixed(2)}`}
                    </span>
                  )}
                </button>
              </div>
            )}

            {!isAuthenticated && (
              <div className="pt-2 text-center text-xs text-slate-500">
                <span>Sign in as a student to register. </span>
                <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                  Sign in
                </Link>
              </div>
            )}

            {/* Utility actions: Add to calendar & Share */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => downloadCalendarInvite(event)}
                className="flex-1 py-1.5 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                title="Download .ics calendar invite"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Add to Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  success('Event link copied to clipboard!');
                }}
                className="flex-1 py-1.5 px-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                title="Share event link"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmedRegistration && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmedRegistration(null)}
          title="Registration Pass"
          maxWidth="md"
        >
          <div className="space-y-4 text-center py-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {confirmedRegistration.status === 'CONFIRMED'
                  ? 'Registration Confirmed!'
                  : 'Added to Waitlist!'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Your campus pass for <strong className="font-semibold text-slate-800">{confirmedRegistration.eventTitle}</strong> is ready.
              </p>
            </div>

            {/* Digital Pass / Ticket Card */}
            <div className="bg-slate-900 text-white rounded-xl p-4 text-left shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <span className="text-[10px] text-slate-400 font-mono block">CAMPUS CONNECT TICKET</span>
                  <span className="text-xs font-bold text-slate-200">{event.category} Event</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  confirmedRegistration.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {confirmedRegistration.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pass Code:</span>
                  <span className="font-bold text-white">{confirmedRegistration.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date:</span>
                  <span>{formatEventDate(confirmedRegistration.eventDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue:</span>
                  <span className="truncate max-w-[200px]">{confirmedRegistration.eventVenue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ticket Price:</span>
                  <span className="font-bold text-emerald-400">
                    {!event.price || event.price === 0 ? 'FREE ($0.00)' : `$${event.price.toFixed(2)} PAID`}
                  </span>
                </div>
              </div>

              {/* Simulated barcode / QR graphic */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-slate-300" />
                  <span className="text-[10px]">Show Pass at Venue</span>
                </div>
                <span className="font-mono text-[10px] text-slate-500">AUTH: VERIFIED</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => downloadCalendarInvite(event)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Save to Calendar</span>
              </button>
              <Link
                to="/registrations"
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                View in My Registrations
              </Link>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
