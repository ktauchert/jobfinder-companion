export interface ProfileQueue {
  enqueueEmbed(profileId: string): Promise<void>;
  close(): Promise<void>;
}
