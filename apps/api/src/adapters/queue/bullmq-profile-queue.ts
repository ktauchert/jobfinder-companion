import type { ProfileQueue } from "../../ports/profile-queue.js";
import { profileEmbedJobId } from "./job-ids.js";
import type { AppQueues } from "./queues.js";

export function createBullmqProfileQueue(queues: AppQueues): ProfileQueue {
  return {
    async enqueueEmbed(profileId: string): Promise<void> {
      await queues.profileEmbed.add(
        "embed",
        { profileId },
        {
          jobId: profileEmbedJobId(profileId),
        },
      );
    },

    async close(): Promise<void> {
      await queues.profileEmbed.close();
    },
  };
}
