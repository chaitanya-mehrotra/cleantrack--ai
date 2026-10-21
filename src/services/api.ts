import {
  AuthResponse,
  User,
  Complaint,
  AIClassifyResponse,
  ServiceZone,
  AdminAnalytics,
  HotspotCluster,
  AuditLogItem,
  WorkerTask
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('cleantrack_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Request failed (${res.status})`;
    try {
      const errData = await res.json();
      errorMsg = errData.detail || errorMsg;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: { email: string; display_name: string; password: string; role?: string; phone_optional?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request<User>('/auth/me'),

  // AI Classification
  classifyWaste: (data: { description: string; image_base64?: string; latitude?: number; longitude?: number }) =>
    request<AIClassifyResponse>('/ai/classify', { method: 'POST', body: JSON.stringify(data) }),

  // Complaints
  getComplaints: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Complaint[]>(`/complaints${qs}`);
  },

  getComplaintById: (idOrRef: string | number) =>
    request<Complaint>(`/complaints/${idOrRef}`),

  submitComplaint: (data: {
    description: string;
    latitude: number;
    longitude: number;
    location_accuracy?: number;
    location_description?: string;
    issue_category?: string;
    waste_categories?: string[];
    priority?: string;
    priority_reason?: string;
    classification_source?: string;
    image_base64?: string;
  }) => request<Complaint>('/complaints', { method: 'POST', body: JSON.stringify(data) }),

  supportComplaint: (id: number) =>
    request<{ supported: boolean; message: string }>(`/complaints/${id}/support`, { method: 'POST' }),

  checkNearbyDuplicates: (lat: number, lng: number, issue_category: string = 'General / Mixed Waste', radius_meters: number = 75) =>
    request<{
      has_possible_duplicates: boolean;
      duplicate_count: number;
      nearby_complaints: Array<{
        id: number;
        public_reference: string;
        issue_category: string;
        status: string;
        priority: string;
        location_description: string;
        distance_meters: number;
        created_at: string;
      }>;
    }>(`/complaints/nearby-check?lat=${lat}&lng=${lng}&issue_category=${encodeURIComponent(issue_category)}&radius_meters=${radius_meters}`),

  updateComplaintStatus: (id: number, new_status: string, reason: string) =>
    request<Complaint>(`/complaints/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ new_status, reason }),
    }),

  overridePriority: (id: number, new_priority: string, override_reason: string) =>
    request<Complaint>(`/complaints/${id}/priority`, {
      method: 'POST',
      body: JSON.stringify({ new_priority, override_reason }),
    }),

  reopenComplaint: (id: number, reason: string) =>
    request<Complaint>(`/complaints/${id}/reopen?reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
    }),

  confirmCleanup: (id: number) =>
    request<Complaint>(`/complaints/${id}/confirm-cleanup`, { method: 'POST' }),

  // Assignments & Worker Portal
  getMyTasks: () => request<WorkerTask[]>('/assignments/my-tasks'),

  assignComplaint: (complaintId: number, workerId: number, notes?: string) =>
    request<any>(`/assignments?complaint_id=${complaintId}`, {
      method: 'POST',
      body: JSON.stringify({ worker_id: workerId, notes }),
    }),

  updateTaskProgress: (
    assignmentId: number,
    data: {
      status: string;
      notes?: string;
      obstacle_reported?: boolean;
      obstacle_notes?: string;
      after_image_base64?: string;
    }
  ) =>
    request<{ message: string }>(`/assignments/${assignmentId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  reportObstacle: (assignmentId: number, obstacle_notes: string) =>
    request<{ message: string }>(`/assignments/${assignmentId}/obstacle?obstacle_notes=${encodeURIComponent(obstacle_notes)}`, {
      method: 'POST',
    }),

  // Admin & Municipal Services
  getAdminAnalytics: () => request<AdminAnalytics>('/admin/analytics'),

  getHotspots: (grid_km: number = 0.5) =>
    request<HotspotCluster[]>(`/admin/hotspots?grid_km=${grid_km}`),

  getAuditLogs: (limit: number = 50) =>
    request<AuditLogItem[]>(`/admin/audit-logs?limit=${limit}`),

  getSanitationWorkers: () =>
    request<Array<{ id: number; display_name: string; email: string; phone_optional?: string; active_tasks: number }>>('/admin/workers'),

  // Wards & Notifications
  getWards: () => request<ServiceZone[]>('/wards'),

  getNotifications: () =>
    request<Array<{ id: number; complaint_id?: number; event_type: string; title: string; message: string; is_read: boolean; created_at: string }>>('/notifications'),

  markNotificationRead: (id: number) =>
    request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),

  // Migration from localStorage
  importLegacyReports: (reports: any[]) =>
    request<{ success: boolean; imported_count: number; errors: string[]; message: string }>('/migration/import-legacy', {
      method: 'POST',
      body: JSON.stringify({ reports }),
    }),
};
