import {
  Activity, BarChart3, Bell, Brain, CalendarDays, CreditCard, LayoutDashboard, ListChecks,
  Megaphone, Scissors, Settings, Sparkles, Star, Users, UsersRound, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  badge?: "pending" | "waitlist" | "unread";
  hint?: string;
};

export type NavSection = { title: string; items: NavItem[] };

const ALL: Role[] = ["owner", "manager", "staff"];
const MGMT: Role[] = ["owner", "manager"];

export const NAV: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ALL },
      { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, roles: ALL },
      { href: "/dashboard/bookings", label: "Bookings", icon: ListChecks, roles: ALL, badge: "pending" },
      { href: "/dashboard/customers", label: "Customers", icon: Users, roles: ALL },
      { href: "/dashboard/waitlist", label: "Waitlist", icon: Clock, roles: MGMT, badge: "waitlist" },
    ],
  },
  {
    title: "Team & catalog",
    items: [
      { href: "/dashboard/staff", label: "Staff", icon: UsersRound, roles: MGMT },
      { href: "/dashboard/services", label: "Services & pricing", icon: Scissors, roles: MGMT },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/dashboard/payments", label: "Payments", icon: CreditCard, roles: MGMT },
      { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, roles: MGMT },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/dashboard/marketing", label: "Marketing", icon: Megaphone, roles: MGMT },
      { href: "/dashboard/reviews", label: "Reviews", icon: Star, roles: ALL },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/dashboard/ai", label: "AI Studio", icon: Brain, roles: ALL, hint: "New" },
      { href: "/dashboard/activity", label: "Activity log", icon: Activity, roles: MGMT },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell, roles: ALL, badge: "unread" },
      { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ALL },
    ],
  },
];

export const ALL_NAV = NAV.flatMap((s) => s.items);

export function navForRole(role: Role) {
  return NAV.map((section) => ({
    ...section,
    items: section.items.filter((i) => i.roles.includes(role)),
  })).filter((s) => s.items.length > 0);
}

export const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Your business at a glance" },
  "/dashboard/calendar": { title: "Calendar", subtitle: "Live availability across the team" },
  "/dashboard/bookings": { title: "Bookings", subtitle: "Every appointment, request and cancellation" },
  "/dashboard/customers": { title: "Customers", subtitle: "Profiles, history and loyalty" },
  "/dashboard/waitlist": { title: "Waitlist", subtitle: "Turn cancellations into revenue" },
  "/dashboard/staff": { title: "Staff", subtitle: "Schedules, time off and performance" },
  "/dashboard/services": { title: "Services & pricing", subtitle: "Your catalog, durations and add-ons" },
  "/dashboard/payments": { title: "Payments", subtitle: "Invoices, refunds and transactions" },
  "/dashboard/analytics": { title: "Analytics", subtitle: "Revenue, demand and customer growth" },
  "/dashboard/marketing": { title: "Marketing", subtitle: "Campaigns, coupons and referrals" },
  "/dashboard/reviews": { title: "Reviews", subtitle: "What your clients are saying" },
  "/dashboard/ai": { title: "AI Studio", subtitle: "Your scheduling co-pilot" },
  "/dashboard/activity": { title: "Activity log", subtitle: "Full audit trail of every change" },
  "/dashboard/notifications": { title: "Notifications", subtitle: "Reminders, alerts and digests" },
  "/dashboard/settings": { title: "Settings", subtitle: "Business, booking and access rules" },
};

export function titleFor(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  const match = Object.keys(PAGE_TITLES).find((k) => k !== "/dashboard" && pathname.startsWith(k));
  return match ? PAGE_TITLES[match] : { title: "Dashboard", subtitle: "" };
}

export const QUICK_ICON = Sparkles;
