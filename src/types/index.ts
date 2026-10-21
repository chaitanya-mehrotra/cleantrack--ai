export type UserRole = 'citizen' | 'admin' | 'worker';

export interface User {
  id: number;
  email: string;
  display_name: string;
  phone_optional?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ComplaintImage {
  id: number;
  storage_path: string;
  image_type: string;
  visual_ai_verdict?: string;
  created_at: string;
}

export interface Assignment {
  id: number;
  complaint_id: number;
  worker_id: number;
  worker_name?: string;
  status: string;
  notes?: string;
  obstacle_reported: boolean;
  obstacle_notes?: string;
  assigned_at: string;
  completed_at?: string;
}

export interface StatusHistory {
  id: number;
  previous_status: string;
  new_status: string;
  reason: string;
  changed_by_name?: string;
  changed_at: string;
}

export interface Complaint {
  id: number;
  public_reference: string;
  user_id?: number;
  reporter_name?: string;
  description: string;
  issue_category: string;
  waste_categories: string[];
  latitude: number;
  longitude: number;
  location_accuracy: number;
  location_description: string;
  priority: 'High' | 'Medium' | 'Low';
  priority_reason?: string;
  priority_overridden: boolean;
  priority_override_reason?: string;
  classification_source: string;
  ai_confidence: number;
  status: 'Submitted' | 'Assigned' | 'In Progress' | 'Cleanup Review' | 'Resolved' | 'Reopened' | 'Rejected';
  service_zone_name?: string;
  support_count: number;
  has_user_supported: boolean;
  images: ComplaintImage[];
  assignments: Assignment[];
  status_history: StatusHistory[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface VisionFeatureSummary {
  is_valid_image: boolean;
  brightness_score: number;
  contrast_score: number;
  edge_density: number;
  clutter_anomaly_score: number;
  detected_visual_clues: string[];
  verdict: string;
}

export interface AIClassifyResponse {
  issue_category: string;
  waste_categories: string[];
  suggested_priority: 'High' | 'Medium' | 'Low';
  priority_reason: string;
  confidence: number;
  human_readable_explanation: string;
  requires_manual_review: boolean;
  vision_analysis?: VisionFeatureSummary;
}

export interface ServiceZone {
  id: number;
  name: string;
  ward_number: string;
  lat_center: number;
  lng_center: number;
  radius_km: number;
}

export interface AdminAnalytics {
  summary: {
    total_reports: number;
    high_priority: number;
    resolved: number;
    in_progress: number;
    review_pending: number;
    pending_submitted: number;
    overdue_unresolved: number;
    resolution_rate_percent: number;
  };
  issue_breakdown: Array<{ category: string; count: number; percentage: number }>;
  material_breakdown: Array<{ material: string; count: number }>;
  ward_performance: Array<{
    ward_id: number;
    ward_name: string;
    ward_number: string;
    total_complaints: number;
    resolved_complaints: number;
    resolution_rate: number;
  }>;
}

export interface HotspotCluster {
  latitude: number;
  longitude: number;
  count: number;
  high_priority_count: number;
  active_count: number;
  resolved_count: number;
  categories: Record<string, number>;
}

export interface AuditLogItem {
  id: number;
  actor_id?: number;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  timestamp: string;
}

export interface WorkerTask {
  assignment_id: number;
  complaint_id: number;
  public_reference: string;
  description: string;
  issue_category: string;
  priority: string;
  status: string;
  assignment_status: string;
  latitude: number;
  longitude: number;
  location_description: string;
  notes?: string;
  obstacle_reported: boolean;
  obstacle_notes?: string;
  before_images: string[];
  after_images: string[];
  assigned_at: string;
  navigation_url: string;
}
