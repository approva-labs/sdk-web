import { ApprovaError, ApprovaErrorCode } from "../transport/errors";

import type { AuthorizationOptions } from "../authorization/authorization.types";

export function validateAuthorizationRequest(
  request: AuthorizationOptions
): void {
  if (!request.action) {
    throw new ApprovaError(
      ApprovaErrorCode.INVALID_REQUEST,
      "Authorization action is required."
    );
  }

  if (!request.description?.trim()) {
    throw new ApprovaError(
      ApprovaErrorCode.INVALID_REQUEST,
      "Authorization description is required."
    );
  }

  if (request.amount !== undefined && Number.isNaN(Number(request.amount))) {
    throw new ApprovaError(
      ApprovaErrorCode.INVALID_REQUEST,
      "Authorization amount must be numeric."
    );
  }

  if (request.chain && request.chain !== "base") {
    throw new ApprovaError(
      ApprovaErrorCode.INVALID_REQUEST,
      "Approva currently supports Base in this SDK."
    );
  }
}
