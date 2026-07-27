import type { ErrorDetail } from "./types.js";

export class TemporalGuardError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: ErrorDetail[];
  readonly requestId?: string;

  constructor(input: {
    message: string;
    status: number;
    code: string;
    details?: ErrorDetail[];
    requestId?: string;
  }) {
    super(input.message);
    this.name = "TemporalGuardError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
    this.requestId = input.requestId;
  }
}
