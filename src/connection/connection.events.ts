export type ConnectionSocketEvent =
  | {
      type: "connection.pending";
      connectionId: string;
    }
  | {
      type: "connection.approved";
      connectionId: string;
      sessionId: string;
    }
  | {
      type: "connection.rejected";
      connectionId: string;
    }
  | {
      type: "connection.expired";
      connectionId: string;
    };
