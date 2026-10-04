import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Building2, Check, ArrowRight, Bookmark, Tag } from 'lucide-react';
import { EventItem } from '../../types';
import { SeatAvailability } from './SeatAvailability';
import { EventStatusBadge } from './EventStatusBadge';
import { RegistrationStatusBadge } from './RegistrationStatusBadge';

interface EventCardProps {
  event: EventItem;
  onToggleSave?: (eventId: string) => void;
}

export function formatEventDate(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export const EventCard: React.FC<EventCardProps> = ({ event, onToggleSave }) => {
  const isClosed = event.status === 'CLOSED';
  const isFree = !event.price || event.price === 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group relative">
      <div>
        {/* Top meta row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
              {event.category}
            </span>

            {/* Price Badge */}
            {isFree ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                FREE
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                ${event.price.toFixed(2)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {event.userRegistration && (
              <RegistrationStatusBadge status={event.userRegistration.status} size="sm" />
            )}
            {event.status === 'CLOSED' && (
              <EventStatusBadge status="CLOSED" size="sm" />
            )}

            {/* Bookmark button */}
            {onToggleSave && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSave(event.id);
                }}
                className={`p-1.5 rounded-md transition-colors ${
                  event.isSaved
                    ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
                title={event.isSaved ? 'Remove bookmark' : 'Bookmark event'}
                aria-label="Bookmark event"
              >
                <Bookmark className={`w-3.5 h-3.5 ${event.isSaved ? 'fill-amber-500' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-1.5">
          <Link to={`/events/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        </h3>

        {/* Organizer */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
          <Building2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{event.organizerName}</span>
        </div>

        {/* Date, Time, Venue */}
        <div className="space-y-1.5 text-xs text-slate-600 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-800">{formatEventDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{event.startTime} – {event.endTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-4">
            {event.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200/60"
              >
                <Tag className="w-2.5 h-2.5 text-slate-400" />
                <span>{tag}</span>
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">+{event.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom status and CTA */}
      <div className="pt-3.5 border-t border-slate-100 mt-2">
        <div className="mb-3">
          <SeatAvailability
            capacity={event.capacity}
            confirmedCount={event.confirmedCount}
            waitlistedCount={event.waitlistedCount}
            compact={false}
            showBar={true}
          />
        </div>

        <Link
          to={`/events/${event.id}`}
          className={`w-full py-2 px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isClosed
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : event.userRegistration
              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isClosed ? (
            <span>View event (Closed)</span>
          ) : event.userRegistration ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Registered · View pass</span>
            </>
          ) : (
            <>
              <span>{isFree ? 'Register free' : `Register · $${event.price.toFixed(2)}`}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </Link>
      </div>
    </div>
  );
};
