import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Save } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EVENT_CATEGORIES } from '../types';

export const CreateEventPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>('Technical');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('2026-10-15');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('01:00 PM');
  const [venue, setVenue] = useState('');
  const [capacity, setCapacity] = useState<number>(50);
  const [price, setPrice] = useState<number>(0);
  const [tags, setTags] = useState('');
  const [organizerName, setOrganizerName] = useState(user?.name || 'Campus Student Association');

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validate = () => {
    if (!title.trim()) return 'Event title is required.';
    if (!category || category === 'All') return 'Please select a valid event category.';
    if (!description.trim()) return 'Event description is required.';
    if (!date) return 'Event date is required.';
    if (!startTime.trim() || !endTime.trim()) return 'Start and end times are required.';
    if (!venue.trim()) return 'Venue location is required.';
    if (isNaN(Number(capacity)) || Number(capacity) <= 0) return 'Capacity must be greater than zero.';
    if (isNaN(Number(price)) || Number(price) < 0) return 'Price must be 0 or a positive number.';
    return null;
  };

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    setErrorMsg(null);
    const err = validate();
    if (err) {
      setErrorMsg(err);
      toastError(err);
      return;
    }

    if (status === 'PUBLISHED') {
      setPublishing(true);
    } else {
      setSaving(true);
    }

    try {
      const res = await api.createEvent({
        title: title.trim(),
        category,
        description: description.trim(),
        date,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        venue: venue.trim(),
        capacity: Number(capacity),
        price: Number(price) || 0,
        tags: tags.trim(),
        status,
        organizerName: organizerName.trim() || user?.name,
      });

      if (res.success) {
        success(status === 'PUBLISHED' ? 'Event published successfully!' : 'Event draft saved successfully!');
        navigate('/organizer');
      }
    } catch (apiErr: any) {
      const msg = apiErr.message || 'Failed to save event.';
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

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
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Create Campus Event
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Specify event details, schedule, venue, and seat capacity.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
            {errorMsg}
          </div>
        )}

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="title">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI & Machine Learning Workshop"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Category & Organizer Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="category">
                Category <span className="text-rose-500">*</span>
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
                Hosting Organization / Department
              </label>
              <input
                id="organizer"
                type="text"
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. Computer Science Club"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="description">
              Event Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide agenda, expectations, required materials, or prerequisites..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Date, Start Time, End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="date">
                Date <span className="text-rose-500">*</span>
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
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="startTime"
                type="text"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="endTime">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                id="endTime"
                type="text"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="01:00 PM"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>
          </div>

          {/* Venue & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="venue">
                Venue / Room Location <span className="text-rose-500">*</span>
              </label>
              <input
                id="venue"
                type="text"
                required
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Seminar Hall 2, Science Complex"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="capacity">
                Capacity Limit (Seats) <span className="text-rose-500">*</span>
              </label>
              <input
                id="capacity"
                type="number"
                min="1"
                required
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-slate-400"
              />
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
              <p className="text-[11px] text-slate-400 mt-1">Students can search and filter by these tags.</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link
              to="/organizer"
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg text-center transition-colors"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={saving || publishing}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving draft...' : 'Save draft'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('PUBLISHED')}
              disabled={saving || publishing}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{publishing ? 'Publishing...' : 'Publish event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
