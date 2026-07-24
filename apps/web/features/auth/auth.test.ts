import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema, validateLogo } from "./auth";

describe("auth schemas", () => {
  it("validates login email", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "secret" })
        .success,
    ).toBe(false);
  });

  it("enforces signup password requirements", () => {
    expect(
      signupSchema.safeParse({
        firstName: "Ada",
        lastName: "Okafor",
        email: "ada@example.com",
        password: "weak",
        businessName: "Northstar",
      }).success,
    ).toBe(false);
  });

  it("rejects oversized and unsupported logos", () => {
    expect(
      validateLogo(new File(["text"], "logo.txt", { type: "text/plain" })),
    ).toContain("PNG");
    const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "logo.png", {
      type: "image/png",
    });
    expect(validateLogo(large)).toContain("5 MB");
  });
});
