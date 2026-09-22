import type { Profile, UpdateProfileRequest } from "@jobfinder/types";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type RefObject } from "react";

import { Badge } from "@/components/ui/badge.js";
import { Input } from "@/components/ui/input.js";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command.js";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover.js";
import type { HomeSearch } from "@/lib/home-search.js";
import { useProfile, useSkillsSearch, useUpdateProfile } from "@/lib/queries.js";
import { cn } from "@/lib/utils.js";

interface TagBarProps {
  q: string | undefined;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

interface ProfileDraft {
  mustHaveSkills: string[];
  excludeSkills: string[];
  ingestQueries: string[];
}

export function TagBar({ q, searchInputRef }: TagBarProps) {
  const { data } = useProfile();
  const updateProfile = useUpdateProfile();
  const navigate = useNavigate({ from: "/" });
  const profile = data?.profile;
  const profileKey = profile ? `${profile.id}:${profile.updatedAt}` : "loading";

  return (
    <TagBarLoaded
      key={profileKey}
      profile={profile}
      q={q ?? ""}
      searchInputRef={searchInputRef}
      onSearchChange={(value) => {
        void navigate({
          search: (prev: HomeSearch): HomeSearch => {
            const next: HomeSearch = { ...prev };
            if (value.trim()) {
              next.q = value;
            } else {
              delete next.q;
            }
            return next;
          },
        });
      }}
      updateProfile={updateProfile}
    />
  );
}

interface TagBarLoadedProps {
  profile: Profile | undefined;
  q: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  updateProfile: ReturnType<typeof useUpdateProfile>;
}

function TagBarLoaded({ profile, q, searchInputRef, onSearchChange, updateProfile }: TagBarLoadedProps) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [novelSkills, setNovelSkills] = useState<Set<string>>(() => new Set());
  const { mutate } = updateProfile;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const mustHaveSkills = draft?.mustHaveSkills ?? profile?.mustHaveSkills ?? [];
  const excludeSkills = draft?.excludeSkills ?? profile?.excludeSkills ?? [];
  const ingestQueries = draft?.ingestQueries ?? profile?.ingestQueries ?? [];

  useEffect(() => {
    const currentProfile = profileRef.current;
    if (!currentProfile || !draft) {
      return;
    }

    const handle = window.setTimeout(() => {
      mutate(
        buildProfileInput(
          currentProfile,
          draft.mustHaveSkills,
          draft.excludeSkills,
          draft.ingestQueries,
        ),
        {
          onSuccess: () => setDraft(null),
        },
      );
    }, 400);

    return () => window.clearTimeout(handle);
  }, [draft, mutate]);

  const updateDraft = (next: ProfileDraft) => {
    setDraft(next);
  };

  return (
    <section className="flex flex-col gap-3 border-b px-4 py-3" aria-label="Search profile">
      <div className="flex flex-col gap-1">
        <label htmlFor="job-search-q" className="text-xs font-medium text-muted-foreground">
          Search
        </label>
        <Input
          id="job-search-q"
          ref={searchInputRef}
          value={q}
          placeholder="Free-text query (optional)"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <SimpleTagField
        label="Ingest"
        tags={ingestQueries}
        onTagsChange={(ingestQueries) =>
          updateDraft({ mustHaveSkills, excludeSkills, ingestQueries })
        }
        placeholder="Role search term (e.g. softwareentwickler)"
      />
      <TagField
        label="Skills"
        tags={mustHaveSkills}
        novelSkills={novelSkills}
        onTagsChange={(mustHaveSkills) =>
          updateDraft({ mustHaveSkills, excludeSkills, ingestQueries })
        }
        onMarkNovel={(tag) => setNovelSkills((current) => new Set(current).add(tag))}
        placeholder="Must-have skill"
      />
      <TagField
        label="Exclude"
        tags={excludeSkills}
        novelSkills={novelSkills}
        onTagsChange={(excludeSkills) =>
          updateDraft({ mustHaveSkills, excludeSkills, ingestQueries })
        }
        onMarkNovel={(tag) => setNovelSkills((current) => new Set(current).add(tag))}
        placeholder="Exclude skill"
      />
    </section>
  );
}

interface TagFieldProps {
  label: string;
  tags: string[];
  novelSkills: Set<string>;
  onTagsChange: (tags: string[]) => void;
  onMarkNovel: (tag: string) => void;
  placeholder: string;
}

function TagField({
  label,
  tags,
  novelSkills,
  onTagsChange,
  onMarkNovel,
  placeholder,
}: TagFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const { data: suggestions } = useSkillsSearch(draft, open);

  const addTag = (raw: string, fromSuggestion: boolean) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) {
      setDraft("");
      setOpen(false);
      return;
    }
    if (!fromSuggestion) {
      onMarkNovel(value);
    }
    onTagsChange([...tags, value]);
    setDraft("");
    setOpen(false);
  };

  const removeLast = () => {
    if (draft.trim()) {
      return;
    }
    onTagsChange(tags.slice(0, -1));
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Popover open={open && draft.trim().length > 0} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn(novelSkills.has(tag) && "border-dashed")}
            >
              {tag}
              {novelSkills.has(tag) ? (
                <span className="text-[10px] text-muted-foreground">new</span>
              ) : null}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${tag}`}
                onClick={() => onTagsChange(tags.filter((entry) => entry !== tag))}
              >
                ×
              </button>
            </Badge>
          ))}
          <PopoverAnchor asChild>
            <Input
              id={inputId}
              ref={inputRef}
              value={draft}
              className="h-7 min-w-32 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
              placeholder={placeholder}
              onChange={(event) => {
                setDraft(event.target.value);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTag(draft, false);
                }
                if (event.key === "Backspace") {
                  removeLast();
                }
                if (event.key === "Tab") {
                  setOpen(false);
                }
              }}
              onFocus={() => setOpen(true)}
            />
          </PopoverAnchor>
        </div>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>No matching skills</CommandEmpty>
              <CommandGroup>
                {suggestions?.skills.map((skill) => (
                  <CommandItem
                    key={skill.id}
                    value={skill.label}
                    onSelect={() => addTag(skill.label, true)}
                  >
                    {skill.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface SimpleTagFieldProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder: string;
}

function SimpleTagField({ label, tags, onTagsChange, placeholder }: SimpleTagFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value || tags.includes(value)) {
      setDraft("");
      return;
    }
    onTagsChange([...tags, value]);
    setDraft("");
  };

  const removeLast = () => {
    if (draft.trim()) {
      return;
    }
    onTagsChange(tags.slice(0, -1));
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background px-2 py-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
            <button
              type="button"
              className="ml-1 text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${tag}`}
              onClick={() => onTagsChange(tags.filter((entry) => entry !== tag))}
            >
              ×
            </button>
          </Badge>
        ))}
        <Input
          id={inputId}
          ref={inputRef}
          value={draft}
          className="h-7 min-w-32 flex-1 border-0 px-1 shadow-none focus-visible:ring-0"
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(draft);
            }
            if (event.key === "Backspace") {
              removeLast();
            }
          }}
        />
      </div>
    </div>
  );
}

function buildProfileInput(
  profile: Profile,
  mustHaveSkills: string[],
  excludeSkills: string[],
  ingestQueries: string[],
): UpdateProfileRequest {
  return {
    name: profile.name,
    mustHaveSkills,
    excludeSkills,
    summary: profile.summary,
    ingestQueries,
    remoteTypes: profile.remoteTypes,
    countryCodes: profile.countryCodes,
    minSalary: profile.minSalary,
  };
}
