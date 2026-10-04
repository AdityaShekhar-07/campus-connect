import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { EventItem, EVENT_CATEGORIES } from '../types';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/common/Skeleton';

export const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [originalEvent, setOriginalEvent] = useState<EventItem | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Technical');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [capacity, setCapacity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);
  const [tags, setTags] = useState('');
  const [organizerName, setOrganizerName] = useState('');

  useEffect(() => {
    async function loadEvent() {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.getEventById(id);
        if (res.success) {
          const e = res.event;
          setOriginalEvent(e);
          setTitle(e.title);
          setCategory(e.category);
          setDescription(e.description);
          setDate(e.date);
          setStartTime(e.startTime);
          setEndTime(e.endTime);
          setVenue(e.venue);
          setCapacity(e.capacity);
          setPrice(e.price || 0);
          setTags(e.tags && Array.isArray(e.tags) ? e.tags.join(', ') : '');
          setOrganizerName(e.organizerName);
        }
      } catch (err: any) {
        toastError(err.message || 'Failed to load event for editing.');
        navigate('/organizer');
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id, navigate, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !originalEvent) return;
    setErrorMsg(null);

    // Validate fields
    if (!title.trim()) {
      setErrorMsg('Event title is required.');
      return;
    }
    if (!category || category === 'All') {
      setErrorMsg('Please choose a valid category.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Description is required.');
      return;
    }
    if (!venue.trim()) {
      setErrorMsg('Venue is required.');
      return;
    }

    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum <= 0) {
      setErrorMsg('Capacity must be greater than zero.');
      return;
    }

    if (isNaN(Number(price)) || Number(price) < 0) {
      setErrorMsg('Price must be 0 or a positive number.');
      return;
    }

    // Client-side precheck for capacity reduction
    if (capNum < originalEvent.confirmedCount) {
      const msg = `Capacity cannot be reduced below the current number of confirmed registrations (${originalEvent.confirmedCount}).`;
      setErrorMsg(msg);
      toastError(msg);
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateEvent(id, {
        title: title.trim(),
        category,
        description: description.trim(),
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        venue: venue.trim(),
        capacity: capNum,
        price: Number(price) || 0,
        tags: tags.trim(),
        organizerName: organizerName.trim(),
      });

      if (res.success) {
        success('Event updated successfully.');
        navigate('/organizer');
      }
    } catch (apiErr: any) {
      const msg = apiErr.message || 'Failed to update event.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (originalEvent?.status === 'CLOSED') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Event is Closed</h2>
        <p className="text-sm text-slate-500 mb-6">
          Closed events cannot be modified. Return to dashboard to manage other events.
        </p>
        <Link
          to="/organizer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
        <div className="mb-6 pb-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Edit Event: {originalEvent?.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Modify event schedule, location, or expand capacity.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Confirmed Seats</span>
            <span className="text-sm font-bold text-slate-800">
              {originalEvent?.confirmedCount} / {originalEvent?.capacity}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="title">
              Event Title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
            />
          </div>

          {/* Category & Organizer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="category">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              >
                {EVENT_CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="organizer">
                Organizer Display Name
              </label>
              <input
                id="organizer"
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
            />
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="date">
                Date
              </label>
              <input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="startTime">
                Start Time
              </label>
              <input
                id="startTime"
                type="text"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="endTime">
                End Time
              </label>
              <input
                id="endTime"
                type="text"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          {/* Venue & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="venue">
                Venue Location
              </label>
              <input
                id="venue"
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="capacity">
                Capacity Limit (Seats)
              </label>
              <input
                id="capacity"
                type="number"
                min={originalEvent?.confirmedCount || 1}
                required
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Min {originalEvent?.confirmedCount || 0} (current confirmed)
              </span>
            </div>
          </div>

          {/* Price & Tags / Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="price">
                Admission Price ($ USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">$</span>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Set to 0 for free events.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="tags">
                Tags & Highlights (comma separated)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. Free Food, Swag, Certificate, Beginner-friendly"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">Tags appear as badges on the event discovery card.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              to="/organizer"
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Updating...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
