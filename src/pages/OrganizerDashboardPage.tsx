import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  XCircle,
  Upload,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { api } from '../lib/api';
import { DashboardStats, EventItem } from '../types';
import { StatCard } from '../components/common/StatCard';
import { EventStatusBadge } from '../components/common/EventStatusBadge';
import { formatEventDate } from '../components/common/EventCard';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { StatCardSkeleton, TableRowSkeleton } from '../components/common/Skeleton';
import { useToast } from '../context/ToastContext';

export const OrganizerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Close event modal state
  const [closingEvent, setClosingEvent] = useState<EventItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getOrganizerDashboard();
      if (res.success) {
        setStats(res.stats);
        setEvents(res.events);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to load organizer dashboard.');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handlePublish = async (event: EventItem) => {
    try {
      const res = await api.publishEvent(event.id);
      if (res.success) {
        success('Event published! Students can now discover and register.');
        await fetchDashboard();
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to publish event.');
    }
  };

  const handleConfirmClose = async () => {
    if (!closingEvent) return;
    setIsClosing(true);
    try {
      const res = await api.closeEvent(closingEvent.id);
      if (res.success) {
        success('Event closed. No new registrations will be accepted.');
        setClosingEvent(null);
        await fetchDashboard();
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to close event.');
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Organizer Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your campus events, monitor seat capacities, and inspect registered participants.
          </p>
        </div>

        <Link
          to="/organizer/events/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Event</span>
        </Link>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Total Events"
              value={stats?.totalEvents ?? 0}
              helperText="Managed by your account"
              icon={Calendar}
            />
            <StatCard
              label="Published"
              value={stats?.publishedEvents ?? 0}
              helperText="Open for discovery"
              icon={CheckCircle2}
            />
            <StatCard
              label="Registrations"
              value={stats?.totalRegistrations ?? 0}
              helperText="Active student seats & waitlists"
              icon={Users}
            />
            <StatCard
              label="Upcoming"
              value={stats?.upcomingEvents ?? 0}
              helperText="Scheduled ahead"
              icon={Clock}
            />
          </>
        )}
      </div>

      {/* My Events Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Events</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review event status, capacity utilization, and manage participant rosters.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            {events.length} {events.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {loading ? (
          <div className="p-4">
            <div className="space-y-3">
              <div className="h-10 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-md animate-pulse" />
              <div className="h-10 bg-slate-100 rounded-md animate-pulse" />
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No events yet"
              description="Create your first campus event to start accepting registrations and managing attendees."
              action={{
                label: 'Create event',
                onClick: () => navigate('/organizer/events/new'),
              }}
            />
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-5">Event</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Registrations</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((evt) => {
                    const isClosed = evt.status === 'CLOSED';
                    const isDraft = evt.status === 'DRAFT';

                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-semibold text-slate-900">{evt.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{evt.venue}</div>
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-600 font-medium">
                          {evt.category}
                        </td>
                        <td className="py-4 px-4 text-xs text-slate-700 whitespace-nowrap">
                          <div>{formatEventDate(evt.date)}</div>
                          <div className="text-[11px] text-slate-400">{evt.startTime}</div>
                        </td>
                        <td className="py-4 px-4 text-xs whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {evt.confirmedCount} / {evt.capacity}
                          </div>
                          {evt.waitlistedCount > 0 && (
                            <div className="text-[11px] text-amber-700 font-medium">
                              +{evt.waitlistedCount} waitlisted
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <EventStatusBadge status={evt.status} size="sm" />
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Participants */}
                            <Link
                              to={`/organizer/events/${evt.id}/participants`}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                              title="View participants"
                            >
                              <Users className="w-4 h-4" />
                            </Link>

                            {/* Edit (if not closed) */}
                            {!isClosed && (
                              <Link
                                to={`/organizer/events/${evt.id}/edit`}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Edit event"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                            )}

                            {/* Publish (if draft) */}
                            {isDraft && (
                              <button
                                type="button"
                                onClick={() => handlePublish(evt)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors"
                              >
                                Publish
                              </button>
                            )}

                            {/* Close (if published) */}
                            {evt.status === 'PUBLISHED' && (
                              <button
                                type="button"
                                onClick={() => setClosingEvent(evt)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                              >
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {events.map((evt) => (
                <div key={evt.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{evt.title}</h3>
                      <div className="text-xs text-slate-500 mt-0.5">{evt.venue}</div>
                    </div>
                    <EventStatusBadge status={evt.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Date & Time</span>
                      <span className="font-medium text-slate-800">{formatEventDate(evt.date)} ({evt.startTime})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Registrations</span>
                      <span className="font-semibold text-slate-800">
                        {evt.confirmedCount} / {evt.capacity}
                        {evt.waitlistedCount > 0 && ` (+${evt.waitlistedCount} wait)`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/organizer/events/${evt.id}/participants`}
                      className="flex-1 py-1.5 px-3 text-xs font-semibold text-center bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg"
                    >
                      Participants
                    </Link>

                    {evt.status !== 'CLOSED' && (
                      <Link
                        to={`/organizer/events/${evt.id}/edit`}
                        className="py-1.5 px-3 text-xs font-semibold text-center border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg"
                      >
                        Edit
                      </Link>
                    )}

                    {evt.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handlePublish(evt)}
                        className="py-1.5 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg"
                      >
                        Publish
                      </button>
                    )}

                    {evt.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={() => setClosingEvent(evt)}
                        className="py-1.5 px-3 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Close Event Modal */}
      <ConfirmDialog
        isOpen={Boolean(closingEvent)}
        onClose={() => setClosingEvent(null)}
        onConfirm={handleConfirmClose}
        title="Close this event?"
        description={`Students will no longer be able to register for "${closingEvent?.title}". Existing registrations will remain intact and viewable.`}
        confirmLabel="Close event"
        cancelLabel="Cancel"
        isLoading={isClosing}
        isDestructive={true}
      />
    </div>
  );
};
