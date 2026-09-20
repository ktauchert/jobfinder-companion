import type {
  EmploymentType,
  NormalizedJob,
  RemoteType,
  Salary,
} from "@jobfinder/types";

const BA_JOB_URL = "https://www.arbeitsagentur.de/jobsuche/jobdetail";

/** Internal BA list/detail payload shapes — not exported (AGENTS.md rule 6). */
interface BaAddress {
  plz?: string;
  ort?: string;
  region?: string;
  land?: string;
}

interface BaLocation {
  adresse?: BaAddress;
}

interface BaListItem {
  stellenangebotsTitel?: string;
  firma?: string;
  referenznummer?: string;
  externeURL?: string;
  stellenlokationen?: BaLocation[];
  homeofficemoeglich?: boolean;
  homeofficetyp?: string;
  arbeitszeitVollzeit?: boolean;
  istGeringfuegigeBeschaeftigung?: boolean;
  arbeitszeitTeilzeitVormittag?: boolean;
  arbeitszeitTeilzeitNachmittag?: boolean;
  arbeitszeitTeilzeitAbend?: boolean;
  arbeitszeitTeilzeitFlexibel?: boolean;
  verguetungsangabe?: string;
  gehaltsspanneVon?: number;
  gehaltsspanneBis?: number;
  veroeffentlichungszeitraum?: { von?: string };
  datumErsteVeroeffentlichung?: string;
}

interface BaDetail extends BaListItem {
  stellenangebotsBeschreibung?: string;
}

export type PartialNormalizedJob = Omit<NormalizedJob, "descriptionRaw" | "descriptionText">;

export function mapBaListItemToPartial(item: unknown): PartialNormalizedJob | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as BaListItem;
  const externalId = row.referenznummer?.trim();
  const title = row.stellenangebotsTitel?.trim();

  if (!externalId || !title) {
    return null;
  }

  return {
    source: "ba",
    externalId,
    title,
    company: row.firma?.trim() ?? null,
    location: formatLocation(row.stellenlokationen?.[0]?.adresse),
    countryCode: mapCountryCode(row.stellenlokationen?.[0]?.adresse?.land),
    remoteType: mapRemoteType(row.homeofficemoeglich, row.homeofficetyp),
    employmentType: mapEmploymentType(row),
    salary: mapSalary(row),
    url: row.externeURL?.trim() ?? `${BA_JOB_URL}/${externalId}`,
    postedAt: mapPostedAt(row),
  };
}

export function mapBaDetailToNormalizedJob(
  listItem: unknown,
  detail: unknown,
): NormalizedJob {
  const partial = mapBaListItemToPartial(listItem);
  if (!partial) {
    throw new Error("Invalid BA list item");
  }

  const detailRow = (detail ?? {}) as BaDetail;
  const descriptionRaw = detailRow.stellenangebotsBeschreibung?.trim() ?? "";

  return {
    ...partial,
    title: detailRow.stellenangebotsTitel?.trim() ?? partial.title,
    company: detailRow.firma?.trim() ?? partial.company,
    location:
      formatLocation(detailRow.stellenlokationen?.[0]?.adresse) ?? partial.location,
    countryCode:
      mapCountryCode(detailRow.stellenlokationen?.[0]?.adresse?.land) ??
      partial.countryCode,
    remoteType: mapRemoteType(detailRow.homeofficemoeglich, detailRow.homeofficetyp),
    employmentType: mapEmploymentType(detailRow),
    salary: mapSalary(detailRow) ?? partial.salary,
    postedAt: mapPostedAt(detailRow) ?? partial.postedAt,
    descriptionRaw,
    descriptionText: markdownToPlainText(descriptionRaw),
  };
}

function formatLocation(address: BaAddress | undefined): string | null {
  if (!address) {
    return null;
  }

  const parts = [address.ort, address.region, address.plz].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function mapCountryCode(land: string | undefined): string | null {
  if (!land) {
    return null;
  }

  const normalized = land.trim().toUpperCase();
  if (normalized === "DEUTSCHLAND" || normalized === "DE") {
    return "DE";
  }

  return null;
}

function mapRemoteType(homeOffice: boolean | undefined, typ: string | undefined): RemoteType {
  if (homeOffice === false) {
    return "onsite";
  }
  if (homeOffice === true) {
    if (typ === "VOLLSTAENDIG") {
      return "remote";
    }
    return "hybrid";
  }
  return "unknown";
}

function mapEmploymentType(row: BaListItem): EmploymentType {
  if (row.istGeringfuegigeBeschaeftigung) {
    return "part_time";
  }
  if (
    row.arbeitszeitTeilzeitVormittag ||
    row.arbeitszeitTeilzeitNachmittag ||
    row.arbeitszeitTeilzeitAbend ||
    row.arbeitszeitTeilzeitFlexibel
  ) {
    return "part_time";
  }
  if (row.arbeitszeitVollzeit) {
    return "full_time";
  }
  return "unknown";
}

function mapSalary(row: BaListItem): Salary | null {
  if (row.verguetungsangabe === "KEINE_ANGABEN" || row.verguetungsangabe === undefined) {
    return null;
  }

  if (row.gehaltsspanneVon === undefined && row.gehaltsspanneBis === undefined) {
    return null;
  }

  return {
    min: row.gehaltsspanneVon ?? null,
    max: row.gehaltsspanneBis ?? null,
    currency: "EUR",
    period: row.verguetungsangabe === "JAHRESGEHALT" ? "year" : "year",
  };
}

function mapPostedAt(row: BaListItem): string | null {
  const date =
    row.veroeffentlichungszeitraum?.von ?? row.datumErsteVeroeffentlichung ?? null;
  if (!date) {
    return null;
  }
  return `${date}T00:00:00.000Z`;
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^-\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
