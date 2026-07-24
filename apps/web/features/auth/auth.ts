import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name"),
  lastName: z.string().trim().min(2, "Enter your last name"),
  email: z.string().email("Enter a valid email address"),
  password: passwordSchema,
  businessName: z.string().trim().min(2, "Enter your business name"),
  logo: z.instanceof(File).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type AuthSession = {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  workspace: { id: string; name: string; logoUrl?: string };
};

export interface AuthClient {
  login(input: LoginInput): Promise<AuthSession>;
  signup(input: SignupInput): Promise<AuthSession>;
  logout(): Promise<void>;
  me(): Promise<AuthSession | null>;
}

const mockSession: AuthSession = {
  user: {
    id: "usr_demo",
    firstName: "Ada",
    lastName: "Okafor",
    email: "ada@northstar.example",
  },
  workspace: { id: "biz_demo", name: "Northstar Labs" },
};

export class MockAuthClient implements AuthClient {
  async login(input: LoginInput) {
    await new Promise((resolve) => setTimeout(resolve, 550));
    if (input.email.toLowerCase() === "error@example.com") {
      throw new Error("AUTH_INVALID_CREDENTIALS");
    }
    return {
      ...mockSession,
      user: { ...mockSession.user, email: input.email },
    };
  }

  async signup(input: SignupInput) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (input.email.toLowerCase() === "existing@example.com") {
      throw new Error("AUTH_EMAIL_ALREADY_EXISTS");
    }
    return {
      user: {
        id: "usr_new",
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
      },
      workspace: { id: "biz_new", name: input.businessName },
    };
  }

  async logout() {
    await Promise.resolve();
  }

  async me() {
    return mockSession;
  }
}

class HttpAuthClient implements AuthClient {
  private readonly baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

  private async request<T>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers:
        init?.body instanceof FormData
          ? init.headers
          : { "content-type": "application/json", ...init?.headers },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
      } | null;
      throw new Error(payload?.code ?? "AUTH_REQUEST_FAILED");
    }
    return (await response.json()) as T;
  }

  login(input: LoginInput) {
    return this.request<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  signup(input: SignupInput) {
    const form = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) form.append(key, value);
    });
    return this.request<AuthSession>("/auth/register", {
      method: "POST",
      body: form,
    });
  }

  async logout() {
    await this.request("/auth/logout", { method: "POST" });
  }

  me() {
    return this.request<AuthSession>("/auth/me");
  }
}

export const authClient: AuthClient = new HttpAuthClient();

export function validateLogo(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "Choose a PNG, JPEG, or WebP image.";
  if (file.size > 5 * 1024 * 1024) return "Logo must be 5 MB or smaller.";
  return null;
}
