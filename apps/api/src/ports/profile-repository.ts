import type { Profile, ProfileInput } from "@jobfinder/types";

export interface ProfileEmbedInput {
  summary: string;
  mustHaveSkills: string[];
}

export interface ProfileRepository {
  ensureDefault(): Promise<Profile>;
  getDefault(): Promise<Profile>;
  update(input: ProfileInput): Promise<Profile>;
  findEmbedInput(profileId: string): Promise<ProfileEmbedInput | null>;
  setEmbedding(profileId: string, embedding: number[]): Promise<void>;
}
