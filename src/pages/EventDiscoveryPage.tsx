import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Calendar, X, RotateCcw, SlidersHorizontal, DollarSign, Bookmark, Sparkles, Tag } from 'lucide-react';
import { api } from '../lib/api';
import { EventItem, EVENT_CATEGORIES } from '../types';
import { EventCard } from '../components/common/EventCard';
import { EventCardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const EventDiscoveryPage: React.FC = () => {
  const { user, isStudent } = useAuth();
  const { success, error: toastError } = useToast();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [availability, setAvailability] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [savedOnly, setSavedOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<string>('soonest');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEvents({
        search: searchTerm,
        category: selectedCategory,
        dateFilter: dateFilter,
        availability: availability,
        priceFilter: priceFilter,
        savedOnly: savedOnly,
        sort: sort,
      });
      if (res.success) {
        setEvents(res.events);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, dateFilter, availability, priceFilter, savedOnly, sort]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 200);

    return () => clearTimeout(timer);
  }, [fetchEvents]);

  const handleToggleSave = async (eventId: string) => {
    if (!user) {
      toastError('Please sign in to bookmark events.');
      return;
    }
    if (!isStudent) {
      toastError('Only student accounts can save bookmarked events.');
      return;
    }

    try {
      const res = await api.toggleSaveEvent(eventId);
      if (res.success) {
        setEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, isSaved: res.isSaved } : e))
        );
        success(res.message);
        if (savedOnly && !res.isSaved) {
          setEvents((prev) => prev.filter((e) => e.id !== eventId));
        }
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to update bookmark.');
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('All');
    setDateFilter('all');
    setAvailability('all');
    setPriceFilter('all');
    setSavedOnly(false);
    setSort('soonest');
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedCategory !== 'All' ||
    dateFilter !== 'all' ||
    availability !== 'all' ||
    priceFilter !== 'all' ||
    savedOnly ||
    sort !== 'soonest';

  const quickSearchTags = ['Free Food', 'Workshop', 'Prizes', 'Tech', 'Music', 'Hackathon'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Discover campus events
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Find workshops, competitions, talks, clubs, and free or ticketed activities across campus.
          </p>
        </div>

        {/* View Saved Events Toggle (for students) */}
        {isStudent && (
          <button
            type="button"
            onClick={() => setSavedOnly(!savedOnly)}
            className={`self-start sm:self-auto px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              savedOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${savedOnly ? 'fill-white' : ''}`} />
            <span>{savedOnly ? 'Showing Bookmarked' : 'My Bookmarks'}</span>
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Universal Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, category, venue, tag (e.g. Free Food), or organizer..."
              className="w-full pl-9 pr-8 py-2.5 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-hidden focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters toggle for Mobile */}
          <div className="flex sm:hidden items-center justify-between gap-2">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && '• Active'}</span>
            </button>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="p-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
              >
                Reset
              </button>
            )}
          </div>

          {/* Desktop Selects */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Price Filter */}
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="py-2.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Prices</option>
              <option value="free">Free Events Only</option>
              <option value="paid">Paid / Ticketed Only</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-2.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">Any Date</option>
              <option value="upcoming">Upcoming</option>
              <option value="today">Today</option>
              <option value="this_week">Next 7 Days</option>
            </select>

            {/* Availability Filter */}
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="py-2.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Seats</option>
              <option value="available">Seats Available</option>
              <option value="full">Event Full</option>
            </select>

            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="py-2.5 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="soonest">Sort: Soonest</option>
              <option value="newest">Sort: Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="most_available">Most Seats Available</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="py-2 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Search Tags Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-500">
          <span className="text-[11px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-500" />
            <span>Popular:</span>
          </span>
          {quickSearchTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSearchTerm(searchTerm === tag ? '' : tag)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 transition-colors ${
                searchTerm === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {priceFilter !== 'free' && (
            <button
              type="button"
              onClick={() => setPriceFilter('free')}
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Free Only ($0)
            </button>
          )}
        </div>

        {/* Mobile Filters Drawer / Accordion */}
        {mobileFilterOpen && (
          <div className="sm:hidden pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Price</label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="all">All Prices</option>
                <option value="free">Free Events Only</option>
                <option value="paid">Paid / Ticketed Only</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Date</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="all">Any Date</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="this_week">Next 7 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Availability</label>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="all">All</option>
                <option value="available">Seats Available</option>
                <option value="full">Full</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sort By</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="soonest">Soonest</option>
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="most_available">Most Seats Available</option>
              </select>
            </div>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-slate-400 font-medium mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </span>
          {EVENT_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md font-medium shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
        <span>
          Showing <span className="font-semibold text-slate-800">{events.length}</span> {events.length === 1 ? 'event' : 'events'}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          {priceFilter !== 'all' && ` (${priceFilter === 'free' ? 'Free only' : 'Paid only'})`}
          {savedOnly && ' (Bookmarked only)'}
          {searchTerm && ` matching "${searchTerm}"`}
        </span>
      </div>

      {/* Content States */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      ) : error ? (
        <EmptyState
          icon={X}
          title="Unable to load events"
          description={error}
          action={{
            label: 'Try again',
            onClick: fetchEvents,
          }}
        />
      ) : events.length === 0 ? (
        <EmptyState
          title={savedOnly ? 'No bookmarked events yet' : 'No events found'}
          description={
            savedOnly
              ? 'Click the bookmark icon on any event to save it here for quick access.'
              : 'Try adjusting your search keywords, price filters, category, or date.'
          }
          action={{
            label: 'Clear all filters',
            onClick: handleClearFilters,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onToggleSave={handleToggleSave} />
          ))}
        </div>
      )}
    </div>
  );
};
