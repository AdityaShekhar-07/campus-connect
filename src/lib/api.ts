import { EventItem, RegistrationItem, DashboardStats, ParticipantItem, User } from '../types';

const TOKEN_KEY = 'campusconnect_auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  code?: string;
  [key: string]: any;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data: ApiResponse = await response.json().catch(() => ({
    success: false,
    message: 'Invalid response from server.',
  }));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg) as Error & { code?: string; status?: number; data?: any };
    error.code = data.code;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

// ================= API METHODS =================

export const api = {
  // Auth
  async login(email: string, password: string):Promise<{ success: boolean; token: string; user: User }> {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async switchDemo(role: 'STUDENT' | 'ORGANIZER'): Promise<{ success: boolean; token: string; user: User }> {
    return apiRequest('/api/auth/demo-switch', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },

  async instantLogin(name: string, role: 'STUDENT' | 'ORGANIZER' = 'STUDENT'): Promise<{ success: boolean; token: string; user: User; message: string }> {
    return apiRequest('/api/auth/instant-login', {
      method: 'POST',
      body: JSON.stringify({ name, role }),
    });
  },

  async logout(): Promise<void> {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      clearToken();
    }
  },

  async getMe(): Promise<{ success: boolean; user: User }> {
    return apiRequest('/api/auth/me');
  },

  // Events
  async getEvents(params?: {
    search?: string;
    category?: string;
    dateFilter?: string;
    availability?: string;
    priceFilter?: string;
    savedOnly?: boolean;
    sort?: string;
  }): Promise<{ success: boolean; events: EventItem[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category && params.category !== 'All') query.set('category', params.category);
    if (params?.dateFilter && params.dateFilter !== 'all') query.set('dateFilter', params.dateFilter);
    if (params?.availability && params.availability !== 'all') query.set('availability', params.availability);
    if (params?.priceFilter && params.priceFilter !== 'all') query.set('priceFilter', params.priceFilter);
    if (params?.savedOnly) query.set('savedOnly', 'true');
    if (params?.sort) query.set('sort', params.sort);

    const qs = query.toString();
    return apiRequest(`/api/events${qs ? `?${qs}` : ''}`);
  },

  async getEventById(id: string): Promise<{ success: boolean; event: EventItem }> {
    return apiRequest(`/api/events/${id}`);
  },

  async toggleSaveEvent(id: string): Promise<{ success: boolean; isSaved: boolean; message: string }> {
    return apiRequest(`/api/events/${id}/save`, {
      method: 'POST',
    });
  },

  async createEvent(data: {
    title: string;
    description: string;
    category: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    capacity: number;
    price?: number;
    tags?: string | string[];
    status: 'DRAFT' | 'PUBLISHED';
    organizerName?: string;
    registrationDeadline?: string;
  }): Promise<{ success: boolean; message: string; eventId: string }> {
    return apiRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateEvent(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      category: string;
      date: string;
      startTime: string;
      endTime: string;
      venue: string;
      capacity: number;
      price?: number;
      tags?: string | string[];
      organizerName?: string;
      registrationDeadline?: string;
    }>
  ): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async publishEvent(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/events/${id}/publish`, {
      method: 'PATCH',
    });
  },

  async closeEvent(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/events/${id}/close`, {
      method: 'PATCH',
    });
  },

  // Registrations
  async registerForEvent(
    eventId: string
  ): Promise<{
    success: boolean;
    message: string;
    status: 'CONFIRMED' | 'WAITLISTED';
    registration: {
      id: string;
      eventId: string;
      eventTitle: string;
      eventDate: string;
      eventVenue: string;
      status: 'CONFIRMED' | 'WAITLISTED';
      registeredAt: string;
    };
  }> {
    return apiRequest(`/api/events/${eventId}/register`, {
      method: 'POST',
    });
  },

  async getMyRegistrations(): Promise<{
    success: boolean;
    upcoming: RegistrationItem[];
    past: RegistrationItem[];
    all: RegistrationItem[];
  }> {
    return apiRequest('/api/registrations/me');
  },

  async cancelRegistration(
    registrationId: string
  ): Promise<{
    success: boolean;
    message: string;
    waitlistPromoted: boolean;
    promotedRegistrationId: string | null;
  }> {
    return apiRequest(`/api/registrations/${registrationId}`, {
      method: 'DELETE',
    });
  },

  // Organizer
  async getOrganizerDashboard(): Promise<{
    success: boolean;
    stats: DashboardStats;
    events: EventItem[];
  }> {
    return apiRequest('/api/organizer/dashboard');
  },

  async getOrganizerEvents(): Promise<{
    success: boolean;
    events: EventItem[];
  }> {
    return apiRequest('/api/organizer/events');
  },

  async getEventParticipants(
    eventId: string
  ): Promise<{
    success: boolean;
    event: {
      id: string;
      title: string;
      capacity: number;
      status: string;
      date: string;
      venue: string;
      confirmedCount: number;
      waitlistedCount: number;
    };
    participants: ParticipantItem[];
  }> {
    return apiRequest(`/api/events/${eventId}/participants`);
  },

  getParticipantExportUrl(eventId: string): string {
    return `/api/events/${eventId}/participants/export`;
  },
};
