import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Search, Users, CheckCircle2, Clock3, Mail, Hash } from 'lucide-react';
import { api } from '../lib/api';
import { ParticipantItem } from '../types';
import { RegistrationStatusBadge } from '../components/common/RegistrationStatusBadge';
import { formatEventDate } from '../components/common/EventCard';
import { Skeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useToast } from '../context/ToastContext';

export const ParticipantListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { error: toastError } = useToast();

  const [eventData, setEventData] = useState<{
    id: string;
    title: string;
    capacity: number;
    status: string;
    date: string;
    venue: string;
    confirmedCount: number;
    waitlistedCount: number;
  } | null>(null);

  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'WAITLISTED'>('ALL');

  const fetchParticipants = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.getEventParticipants(id);
      if (res.success) {
        setEventData(res.event);
        setParticipants(res.participants);
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to load participants list.');
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      searchTerm === '' ||
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.registrationId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDownloadCsv = () => {
    if (!id) return;
    const exportUrl = api.getParticipantExportUrl(id);
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top back link */}
      <div className="mb-6">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizer Dashboard</span>
        </Link>
      </div>

      {/* Header and Summary */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {eventData?.title || 'Participant Roster'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {eventData && `${formatEventDate(eventData.date)} · ${eventData.venue}`}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={loading || participants.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Roster (CSV)</span>
          </button>
        </div>

        {/* Counts summary row */}
        <div className="grid grid-cols-3 gap-4 pt-4 text-center">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block">Total Active</span>
            <span className="text-lg sm:text-xl font-bold text-slate-900">
              {participants.length}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase block">Confirmed</span>
            <span className="text-lg sm:text-xl font-bold text-emerald-900">
              {eventData?.confirmedCount ?? 0} / {eventData?.capacity ?? 0}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200/60">
            <span className="text-[11px] font-semibold text-amber-800 uppercase block">Waitlisted</span>
            <span className="text-lg sm:text-xl font-bold text-amber-900">
              {eventData?.waitlistedCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Participants Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Table Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student name, email, or ID..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({participants.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'CONFIRMED'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Confirmed ({eventData?.confirmedCount ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('WAITLISTED')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'WAITLISTED'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Waitlisted ({eventData?.waitlistedCount ?? 0})
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filteredParticipants.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="No participants found"
              description={
                participants.length === 0
                  ? 'No students have registered for this event yet.'
                  : 'No participants matched your search query.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-5">Student Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Registration ID</th>
                  <th className="py-3 px-4">Registered At</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParticipants.map((p) => (
                  <tr key={p.registrationId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 text-xs sm:text-sm">
                      {p.studentName}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                      {p.studentEmail}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600">
                      {p.registrationId}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(p.registeredAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <RegistrationStatusBadge status={p.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
