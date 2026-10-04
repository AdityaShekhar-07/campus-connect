import React from 'react';
import { Users } from 'lucide-react';

interface SeatAvailabilityProps {
  capacity: number;
  confirmedCount: number;
  waitlistedCount?: number;
  compact?: boolean;
  showBar?: boolean;
}

export const SeatAvailability: React.FC<SeatAvailabilityProps> = ({
  capacity,
  confirmedCount,
  waitlistedCount = 0,
  compact = false,
  showBar = true,
}) => {
  const availableSeats = Math.max(0, capacity - confirmedCount);
  const isFull = confirmedCount >= capacity;
  const percentage = Math.min(100, Math.round((confirmedCount / capacity) * 100));

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="font-medium text-slate-700">
          {confirmedCount}/{capacity}
        </span>
        <span className={`text-[11px] ${isFull ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
          {isFull ? '(Full)' : `(${availableSeats} left)`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{confirmedCount} / {capacity} registered</span>
        </span>
        <span className={`font-medium ${isFull ? 'text-amber-700' : 'text-slate-600'}`}>
          {isFull ? (
            waitlistedCount > 0 ? (
              <span className="text-amber-700 font-medium">Event full ({waitlistedCount} waitlisted)</span>
            ) : (
              <span className="text-amber-700 font-medium">Event full</span>
            )
          ) : (
            <span>{availableSeats} seats remaining</span>
          )}
        </span>
      </div>

      {showBar && (
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isFull
                ? 'bg-amber-500'
                : percentage > 80
                ? 'bg-blue-600'
                : 'bg-slate-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
};
