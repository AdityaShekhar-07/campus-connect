import React from 'react';
import { EventStatus } from '../../types';

interface EventStatusBadgeProps {
  status: EventStatus;
  size?: 'sm' | 'md';
}

export const EventStatusBadge: React.FC<EventStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (status === 'PUBLISHED') {
    return (
      <span className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
        Published
      </span>
    );
  }

  if (status === 'DRAFT') {
    return (
      <span className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 shrink-0" />
        Draft
      </span>
    );
  }

  // CLOSED
  return (
    <span className={`inline-flex items-center font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-200/80 ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 shrink-0" />
      Closed
    </span>
  );
};
