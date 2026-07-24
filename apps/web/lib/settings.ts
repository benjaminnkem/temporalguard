import { z } from "zod";

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter a business name"),
  website: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^https?:\/\/.+/i.test(value),
      "Enter a valid URL including https://",
    ),
  description: z.string().trim().max(2000).optional(),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;

export type BusinessProfile = {
  id: string;
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  description?: string | null;
  updatedAt: string;
};

export type ApiKeySummary = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  fingerprint: string;
};

export type CreatedApiKey = ApiKeySummary & {
  secret: string;
};

export const createApiKeySchema = z.object({
  name: z.string().trim().min(2, "Name the key so your team can recognize it"),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export interface SettingsClient {
  getBusiness(): Promise<BusinessProfile>;
  updateBusiness(input: BusinessProfileInput): Promise<BusinessProfile>;
  listApiKeys(): Promise<ApiKeySummary[]>;
  createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey>;
  revokeApiKey(id: string): Promise<ApiKeySummary>;
}

let mockBusiness: BusinessProfile = {
  id: "biz_demo",
  name: "Northstar Labs",
  logoUrl: null,
  website: "https://northstar.example",
  description:
    "Workflow reliability for document verification and lending operations.",
  updatedAt: new Date().toISOString(),
};

let mockApiKeys: ApiKeySummary[] = [
  {
    id: "key_demo_1",
    name: "Production ingestion",
    keyPrefix: "tg_live_demo",
    lastUsedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    revokedAt: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    fingerprint: "a1b2c3d4e5f6",
  },
];

class MockSettingsClient implements SettingsClient {
  async getBusiness() {
    await delay(200);
    return { ...mockBusiness };
  }

  async updateBusiness(input: BusinessProfileInput) {
    await delay(350);
    mockBusiness = {
      ...mockBusiness,
      name: input.name,
      website: input.website || null,
      description: input.description || null,
      updatedAt: new Date().toISOString(),
    };
    return { ...mockBusiness };
  }

  async listApiKeys() {
    await delay(200);
    return [...mockApiKeys];
  }

  async createApiKey(input: CreateApiKeyInput) {
    await delay(400);
    const secret = `tg_live_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const created: CreatedApiKey = {
      id: `key_${crypto.randomUUID()}`,
      name: input.name,
      keyPrefix: secret.slice(0, 12),
      lastUsedAt: null,
      revokedAt: null,
      createdAt: new Date().toISOString(),
      fingerprint: secret.slice(-12),
      secret,
    };
    mockApiKeys = [created, ...mockApiKeys];
    return created;
  }

  async revokeApiKey(id: string) {
    await delay(250);
    mockApiKeys = mockApiKeys.map((key) =>
      key.id === id
        ? { ...key, revokedAt: key.revokedAt ?? new Date().toISOString() }
        : key,
    );
    const key = mockApiKeys.find((item) => item.id === id);
    if (!key) throw new Error("API_KEY_NOT_FOUND");
    return key;
  }
}

class HttpSettingsClient implements SettingsClient {
  private readonly baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        code?: string;
        message?: string;
      } | null;
      throw new Error(payload?.code ?? payload?.message ?? "SETTINGS_FAILED");
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  getBusiness() {
    return this.request<BusinessProfile>("/business");
  }

  updateBusiness(input: BusinessProfileInput) {
    return this.request<BusinessProfile>("/business", {
      method: "PATCH",
      body: JSON.stringify({
        name: input.name,
        website: input.website || null,
        description: input.description || null,
      }),
    });
  }

  listApiKeys() {
    return this.request<ApiKeySummary[]>("/business/api-keys");
  }

  createApiKey(input: CreateApiKeyInput) {
    return this.request<CreatedApiKey>("/business/api-keys", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  revokeApiKey(id: string) {
    return this.request<ApiKeySummary>(`/business/api-keys/${id}/revoke`, {
      method: "POST",
    });
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const useMock =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ||
  process.env.NEXT_PUBLIC_USE_MOCK_AUTH === "true";

export const settingsClient: SettingsClient = useMock
  ? new MockSettingsClient()
  : new HttpSettingsClient();
