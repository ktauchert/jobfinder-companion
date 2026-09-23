import { useEffect, useState } from "react";

import {
  sseConnectionState,
  subscribeSseConnection,
  type SseConnectionState,
} from "./sse-connection.js";

export function useSseConnection(): SseConnectionState {
  const [state, setState] = useState<SseConnectionState>(sseConnectionState);

  useEffect(() => subscribeSseConnection(setState), []);

  return state;
}
