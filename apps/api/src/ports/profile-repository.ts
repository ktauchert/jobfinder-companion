import type { Profile, ProfileInput, RemoteType } from "@jobfinder/types";

export interface ProfileEmbedInput {
  summary: string;
  mustHaveSkills: string[];
}

export interface ProfileSearchContext {
  id: string;
  embedding: number[] | null;
  mustHaveSkills: string[];
  excludeSkills: string[];
  remoteTypes: RemoteType[];
  countryCodes: string[];
  minSalary: number | null;
  similarityWeight: number;
  maxAgeDays: number | null;
}

export interface ProfileRepository {
  ensureDefault(): Promise<Profile>;
  getDefault(): Promise<Profile>;
  getSearchContext(): Promise<ProfileSearchContext>;
  update(input: ProfileInput): Promise<Profile>;
  findEmbedInput(profileId: string): Promise<ProfileEmbedInput | null>;
  setEmbedding(profileId: string, embedding: number[]): Promise<void>;
}
