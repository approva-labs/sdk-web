export type AuthorizationSocketEvent =
  | {
      type: "authorization.pending";
      request: unknown;
    }
  | {
      type: "authorization.approved";
      result: unknown;
    }
  | {
      type: "authorization.rejected";
      result: unknown;
    }
  | {
      type: "authorization.expired";
      result: unknown;
    };
