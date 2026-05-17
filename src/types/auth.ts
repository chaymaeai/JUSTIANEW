export type UserRole = "client" | "provider" | "expert" | "admin";
export type AccountType = "particulier" | "entreprise" | "cabinet";

export interface RegisterData {
  title: "M." | "Mme" | "Autre";
  firstName: string;
  lastName: string;
  email: string;
  phonePrefix: "+212" | "+33";
  phone: string;
  accountType: AccountType;
  companyName?: string;
  companyId?: string;
  sector?: string;
  legalDomains: string[];
  password: string;
  acceptsTerms: boolean;
  acceptsDataProcessing: boolean;
  acceptsNewsletter: boolean;
  companySize?: string;
barreauCity?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  accountType: AccountType;
  avatar?: string;
  company?: string;
}
