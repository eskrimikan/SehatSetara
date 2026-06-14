export type BaseScreen = "home" | "medical" | "faskes" | "lifestyle" | "qa";
export type AppScreen = BaseScreen | "auth" | "profile" | "publish" | "dashboard";

export interface AuthSession {
  token: string;
  username: string;
  role: string;
  isApproved?: boolean;
  pendingDoctor?: boolean;
  requestedRole?: string;
}

export interface HealthStatMonth {
  month: string;
  completedDays: number;
  totalDays: number;
  percentage: number;
}

export interface HealthCategoryStat {
  key: string;
  label: string;
  completedDays: number;
  totalDays: number;
  percentage: number;
  monthly: HealthStatMonth[];
  yearly: HealthStatMonth[];
}

export interface HealthStatsSummary {
  memberSince: string;
  daysSinceJoined: number;
  totalTrackedDays: number;
  categories: HealthCategoryStat[];
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export interface Article {
  id: number;
  title: string;
  content: string;
  authorName: string;
  authorRole: string;
  authorHospital: string;
  authorProvince: string;
  authorCity: string;
  authorDistrict: string;
  createdAt: string;
}

export interface ProfileData {
  fullName: string;
  age: string;
  province: string;
  city: string;
  district: string;
  hospitalName: string;
  photoDataUrl: string;
}