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