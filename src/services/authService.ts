import type { RegisterData, User, UserRole } from "@/types/auth";
import { api, setAuthToken } from "./api";

type BackendUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "client" | "expert" | "admin";
  company?: string;
  avatar?: string;
  profile_type?: string;
  raison_sociale?: string;
  speciality?: string;
};

type LoginResponse = {
  access: string;
  refresh: string;
  user: BackendUser;
};

type RegisterResponse = {
  user: BackendUser;
  detail?: string;
};

function mapRole(role: BackendUser["role"]): UserRole {
  if (role === "expert") return "provider";
  return role;
}

function mapUser(user: BackendUser): User {
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    role: mapRole(user.role),
    accountType: user.profile_type === "morale" ? "entreprise" : "particulier",
    company: user.company|| user.raison_sociale,
    avatar: user.avatar,
  };
}

export async function login(
  email: string, 
  password: string, 
  userRole?: "client" | "expert" | "admin"
): Promise<{ user: User; token: string; refresh: string }> {
  // Use staff login endpoint for expert and admin roles
  const endpoint = (userRole === "expert" || userRole === "admin") 
    ? "/auth/staff/login/" 
    : "/auth/login/";
  
  const { data } = await api.post<LoginResponse>(endpoint, { email, password });
  setAuthToken(data.access);
  return { user: mapUser(data.user), token: data.access, refresh: data.refresh };
}

export async function register(payload: RegisterData): Promise<RegisterResponse> {
  const backendPayload = {
    email: payload.email,
    password: payload.password,
    password_confirm: payload.password,
    first_name: payload.firstName,
    last_name: payload.lastName,
    phone: `${payload.phonePrefix}${payload.phone}`,
    company: payload.companyName ?? "",
    role: "client",
    profile_type: payload.accountType === "entreprise" || payload.accountType === "cabinet" ? "morale" : "physique",
    raison_sociale: payload.companyName ?? "",
  };
  
  console.log("📤 Sending register payload:", backendPayload);
  
  try {
    const { data } = await api.post<RegisterResponse>("/auth/register/", backendPayload);
    return data;
  } catch (error) {
    console.error("❌ Register error response:", error);
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const axiosError = error as any;
      const errorData = axiosError.response?.data;
      console.error("Response data:", errorData);
      
      // Extract user-friendly message
      if (errorData?.message) {
        // Parse field-specific errors from message like "email: Un objet user..."
        let message = errorData.message;
        if (message.includes(': ')) {
          message = message.split(': ').slice(1).join(': ');
        }
        const err = new Error(message);
        (err as any).response = axiosError.response;
        throw err;
      }
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout/", {});
  } finally {
    setAuthToken(null);
  }
}

export async function me(): Promise<User> {
  const { data } = await api.get<BackendUser>("/auth/me/");
  return mapUser(data);
}
