import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Users, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { EventItem } from '../types';
import { EventCard } from '../components/common/EventCard';
import { EventCardSkeleton } from '../components/common/Skeleton';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated, isOrganizer } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await api.getEvents({ sort: 'soonest' });
        if (res.success) {
          setFeaturedEvents(res.events.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load events preview:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-between">
      {/* Hero Section */}
      <section className="pt-16 pb-12 sm:pt-20 sm:pb-16 max-w-5xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Official Campus Event Discovery & Registration</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Everything happening on campus,<br className="hidden sm:inline" /> in one place.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          Discover workshops, competitions, talks, and club activities. Register with a single click, monitor seat availability in real time, and automatically join waitlists.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
          <Link
            to="/events"
            className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <span>Explore events</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!isAuthenticated ? (
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              Sign in with Demo Account
            </Link>
          ) : (
            <Link
              to={isOrganizer ? '/organizer' : '/registrations'}
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
            >
              {isOrganizer ? 'Organizer Dashboard' : 'My Registrations'}
            </Link>
          )}
        </div>

        {/* Value props in subtle cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16 text-left border-t border-slate-200/80 pt-10">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
            <Calendar className="w-5 h-5 text-slate-700 mb-2" />
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Unified Discovery</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Find technical workshops, cultural nights, sports tryouts, and guest seminars in one synchronized feed.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
            <Users className="w-5 h-5 text-slate-700 mb-2" />
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Guaranteed Seat Limits</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Server-enforced seat capacity guarantees zero overbooking with deterministic waitlist promotions.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
            <ShieldCheck className="w-5 h-5 text-slate-700 mb-2" />
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Organizer Operations</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              University clubs and departments publish drafts, monitor registrations, and export participant rosters seamlessly.
            </p>
          </div>
        </div>
      </section>

      {/* Live Upcoming Events Preview */}
      <section className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Upcoming Events Preview</h2>
              <p className="text-xs text-slate-500">Live feed from the campus event calendar</p>
            </div>
            <Link
              to="/events"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EventCardSkeleton />
              <EventCardSkeleton />
              <EventCardSkeleton />
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredEvents.map((evt) => (
                <EventCard key={evt.id} event={evt} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-slate-200">
              <p className="text-sm text-slate-500">No scheduled events right now.</p>
            </div>
          )}
        </div>
      </section>

      {/* Clean footer */}
      <footer className="border-t border-slate-200 py-6 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          CampusConnect &copy; 2026 — Official Campus Event Management Platform
        </div>
      </footer>
    </div>
  );
};
