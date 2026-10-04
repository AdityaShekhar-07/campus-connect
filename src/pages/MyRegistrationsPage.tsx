import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Clock, ArrowRight, XCircle, AlertCircle, CheckCircle2, QrCode, CalendarPlus, CreditCard } from 'lucide-react';
import { api } from '../lib/api';
import { RegistrationItem } from '../types';
import { RegistrationStatusBadge } from '../components/common/RegistrationStatusBadge';
import { formatEventDate } from '../components/common/EventCard';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';
import { Skeleton } from '../components/common/Skeleton';
import { useToast } from '../context/ToastContext';

function downloadRegistrationCalendar(item: RegistrationItem) {
  try {
    const [year, month, day] = item.eventDate.split('-').map(Number);
    const startDateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T100000Z`;
    const endDateStr = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}T130000Z`;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CampusConnect//Event Calendar//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${item.eventTitle}`,
      `LOCATION:${item.eventVenue}`,
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
    link.setAttribute('download', `${item.eventTitle.replace(/[^a-z0-9]/gi, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (_) {}
}

export const MyRegistrationsPage: React.FC = () => {
  const { success, error: toastError } = useToast();
  const [upcoming, setUpcoming] = useState<RegistrationItem[]>([]);
  const [past, setPast] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  // Selected pass view modal
  const [viewingPass, setViewingPass] = useState<RegistrationItem | null>(null);

  // Cancellation modal state
  const [cancellingItem, setCancellingItem] = useState<RegistrationItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyRegistrations();
      if (res.success) {
        setUpcoming(res.upcoming);
        setPast(res.past);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to load registrations.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleCancelRegistration = async () => {
    if (!cancellingItem) return;

    setIsCancelling(true);
    try {
      const res = await api.cancelRegistration(cancellingItem.id);
      if (res.success) {
        if (res.waitlistPromoted) {
          success('Registration cancelled. The next eligible waitlisted student was promoted to confirmed.');
        } else {
          success('Registration cancelled successfully.');
        }
        setCancellingItem(null);
        await fetchRegistrations();
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to cancel registration.');
    } finally {
      setIsCancelling(false);
    }
  };

  const currentList = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            My Registrations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Keep track of your confirmed seats and waitlisted event applications.
          </p>
        </div>

        <Link
          to="/events"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <span>Discover more events</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors relative ${
            activeTab === 'upcoming'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Upcoming Events</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {upcoming.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('past')}
          className={`pb-3 px-2 text-sm font-semibold transition-colors relative ${
            activeTab === 'past'
              ? 'text-slate-900 border-b-2 border-slate-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Past & Cancelled</span>
          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700">
            {past.length}
          </span>
        </button>
      </div>

      {/* List content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : currentList.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={activeTab === 'upcoming' ? 'No upcoming registrations' : 'No past registrations'}
          description={
            activeTab === 'upcoming'
              ? "You haven't registered for any upcoming events yet. Explore events happening around campus."
              : 'Completed and cancelled registrations will appear here.'
          }
          action={
            activeTab === 'upcoming'
              ? {
                  label: 'Browse campus events',
                  onClick: () => (window.location.href = '/events'),
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {currentList.map((item) => {
            const canCancel = item.status === 'CONFIRMED' || item.status === 'WAITLISTED';

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                      {item.category}
                    </span>
                    <RegistrationStatusBadge status={item.status} size="sm" />
                    
                    {/* Price / Payment Badge */}
                    {!item.price || item.price === 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        FREE PASS
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        ${item.price.toFixed(2)} {item.paymentStatus === 'PAID' ? 'PAID' : ''}
                      </span>
                    )}

                    <span className="text-xs font-mono text-slate-400">
                      ID: {item.id}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900">
                    <Link to={`/events/${item.eventId}`} className="hover:text-blue-600 transition-colors">
                      {item.eventTitle}
                    </Link>
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatEventDate(item.eventDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {item.startTime} – {item.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {item.eventVenue}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setViewingPass(item)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                    title="View digital pass"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-600" />
                    <span>Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadRegistrationCalendar(item)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    title="Add event to calendar (.ics)"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    to={`/events/${item.eventId}`}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    Details
                  </Link>

                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => setCancellingItem(item)}
                      className="px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Digital Pass Modal */}
      {viewingPass && (
        <Modal
          isOpen={true}
          onClose={() => setViewingPass(null)}
          title="Digital Event Pass"
          maxWidth="md"
        >
          <div className="space-y-4 text-center py-2">
            <div className="bg-slate-900 text-white rounded-xl p-5 text-left shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block tracking-widest uppercase">CAMPUSCONNECT PASS</span>
                  <span className="text-sm font-bold text-white">{viewingPass.eventTitle}</span>
                </div>
                <RegistrationStatusBadge status={viewingPass.status} size="sm" />
              </div>

              <div className="space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pass Code:</span>
                  <span className="font-bold text-white tracking-wider">{viewingPass.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span>{formatEventDate(viewingPass.eventDate)} ({viewingPass.startTime})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue:</span>
                  <span className="truncate max-w-[220px]">{viewingPass.eventVenue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ticket Type:</span>
                  <span className="font-bold text-emerald-400">
                    {!viewingPass.price || viewingPass.price === 0 ? 'FREE TICKET' : `$${viewingPass.price.toFixed(2)} PAID`}
                  </span>
                </div>
              </div>

              {/* QR Code graphic */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-slate-200" />
                  <span className="text-[11px] text-slate-400">Scan at entrance</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">STATUS: VALID</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => downloadRegistrationCalendar(viewingPass)}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-slate-500" />
                <span>Download .ics</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingPass(null)}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingItem)}
        onClose={() => setCancellingItem(null)}
        onConfirm={handleCancelRegistration}
        title="Cancel Registration"
        description={
          cancellingItem?.status === 'CONFIRMED'
            ? `Are you sure you want to cancel your confirmed registration for "${cancellingItem?.eventTitle}"? Your seat will be automatically given to the next student on the waitlist.`
            : `Are you sure you want to remove yourself from the waitlist for "${cancellingItem?.eventTitle}"?`
        }
        confirmLabel="Yes, cancel registration"
        cancelLabel="Keep registration"
        isLoading={isCancelling}
        isDestructive={true}
      />
    </div>
  );
};
