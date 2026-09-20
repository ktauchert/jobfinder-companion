import type { IngestionEvent } from "@jobfinder/types";

export interface EventPublisher {
  publish(event: IngestionEvent): Promise<void>;
}
