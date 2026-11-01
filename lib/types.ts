export const BUSINESS = {
  name: "Lumière Studio",
  tagline: "Hair · Skin · Nails · Wellness",
  timezone: "Asia/Singapore",
  currency: "SGD",
  address: "21 Orchard Road, #02-14, Singapore 238839",
  phone: "+65 6733 8899",
  email: "hello@lumierestudio.sg",
  website: "https://lumierestudio.sg",
};

export type Role = "owner" | "manager" | "staff";

export type User = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: Role;
  staff_id: string | null;
  active: number;
  created_at: string;
  last_login_at: string | null;
};

export type Staff = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  avatar_color: string | null;
  bio: string | null;
  specialties: string;
  rating: number;
  hourly_rate: number;
  active: number;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  duration_min: number;
  price: number;
  deposit: number;
  color: string | null;
  buffer_min: number;
  active: number;
  popular: number;
  created_at: string;
};

export type Addon = {
  id: string;
  service_id: string;
  name: string;
  price: number;
  duration_min: number;
  active: number;
};

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  dob: string | null;
  notes: string | null;
  preferences: string | null;
  tags: string;
  loyalty_points: number;
  vip: number;
  marketing_opt_in: number;
  visits: number;
  total_spent: number;
  last_visit_at: string | null;
  created_at: string;
};

export type Booking = {
  id: string;
  code: string;
  customer_id: string;
  staff_id: string;
  service_id: string;
  addons: string;
  start_at: string;
  end_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  payment_status: "unpaid" | "paid" | "refunded" | "partial";
  price: number;
  notes: string | null;
  internal_notes: string | null;
  source: string;
  recurring_rule: string | null;
  parent_id: string | null;
  reminder_sent: number;
  cancelled_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingFull = Booking & {
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_vip: number;
  staff_name: string;
  staff_color: string | null;
  service_name: string;
  service_category: string;
  service_duration: number;
  service_color: string | null;
};

export type Payment = {
  id: string;
  booking_id: string | null;
  customer_id: string;
  invoice_no: string;
  amount: number;
  tip: number;
  tax: number;
  total: number;
  method: string;
  status: "paid" | "pending" | "refunded" | "partial_refund" | "failed";
  refunded_amount: number;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

export type Review = {
  id: string;
  booking_id: string | null;
  customer_id: string;
  staff_id: string | null;
  rating: number;
  comment: string | null;
  reply: string | null;
  tags: string;
  created_at: string;
  customer_name: string;
  staff_name: string | null;
  service_name?: string | null;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: "percent" | "fixed";
  value: number;
  min_amount: number;
  max_uses: number;
  uses: number;
  starts_at: string | null;
  expires_at: string | null;
  active: number;
  created_at: string;
};

export type Campaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  subject: string | null;
  body: string | null;
  audience: string;
  status: "draft" | "scheduled" | "sent";
  recipients: number;
  opened: number;
  clicked: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

export type WaitlistEntry = {
  id: string;
  customer_id: string;
  service_id: string;
  staff_id: string | null;
  desired_from: string | null;
  desired_to: string | null;
  preferred_time: string | null;
  notes: string | null;
  status: "waiting" | "offered" | "booked" | "expired";
  created_at: string;
  customer_name: string;
  customer_phone: string | null;
  service_name: string;
  staff_name: string | null;
};

export type Notification = {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: number;
  created_at: string;
};

export type ActivityLog = {
  id: string;
  actor_name: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  created_at: string;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatar_url: string | null;
  staff_id: string | null;
};
