import React from 'react';
import { RegistrationStatus } from '../../types';

interface RegistrationStatusBadgeProps {
  status: RegistrationStatus;
  size?: 'sm' | 'md';
}

export const RegistrationStatusBadge: React.FC<RegistrationStatusBadgeProps> = ({
  status,
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  if (status === 'CONFIRMED') {
    return (
      <span className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
        Confirmed
      </span>
    );
  }

  if (status === 'WAITLISTED') {
    return (
      <span className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
        Waitlisted
      </span>
    );
  }

  // CANCELLED
  return (
    <span className={`inline-flex items-center font-medium rounded-md bg-slate-100 text-slate-500 border border-slate-200 ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5 shrink-0" />
      Cancelled
    </span>
  );
};
