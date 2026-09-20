# BA Jobsuche API — research note

Research for [#5](https://github.com/ktauchert/jobfinder-companion/issues/5).
Recorded **2026-09-20** against live endpoints. Primary sources only.

## Summary

The Bundesagentur für Arbeit (BA) exposes an undocumented REST API used by the
public Jobsuche web/app frontends. Authentication is a static `X-API-Key` header
(no registration). **Use `/pc/v6/jobs` for search** and **`/pc/v4/jobdetails/{base64(referenznummer)}`
for the full description** — list responses omit body text. Legacy v4 search
endpoints return **403** as of this research date; v6 search and v4 details
both work with `jobboerse-jobsuche`.

Fixtures (recorded live):

- `apps/api/src/adapters/sources/ba/fixtures/jobs-list-v6.json`
- `apps/api/src/adapters/sources/ba/fixtures/job-details-v4.json`

## Sources

| Source | URL | Used for |
| --- | --- | --- |
| OpenAPI spec (community, reverse-engineered) | [bundesAPI/jobsuche-api openapi.yaml](https://github.com/bundesAPI/jobsuche-api/blob/main/openapi.yaml) | Endpoints, query params, auth header |
| Swagger UI mirror | [jobsuche.api.bund.dev](https://jobsuche.api.bund.dev) | Same spec, browsable |
| Example client | [bundesAPI/jobsuche-api api_example.R](https://github.com/bundesAPI/jobsuche-api/blob/main/api_example.R) | Two-step list→detail flow, base64 encoding |
| BA Nutzungsbedingungen | [arbeitsagentur.de/nutzungsbedingungen](https://www.arbeitsagentur.de/nutzungsbedingungen) | Copyright, robots/automation clause |
| BA statement on API documentation (2021) | [netzpolitik.org](https://netzpolitik.org/2021/open-data-arbeitsagentur-kaempft-gegen-offene-schnittstelle/) | BA position on mass automated access |
| Live verification | `curl` against `rest.arbeitsagentur.de` | Confirmed auth, schemas, errors (this note) |

The BA does **not** publish an official API document or open-data licence for
this endpoint. The bundesAPI spec describes behaviour observed from the Jobsuche
app; treat field names as empirical, not contractual.

## Base URL and authentication

| Item | Value |
| --- | --- |
| Base URL | `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service` |
| Auth header | `X-API-Key: jobboerse-jobsuche` |
| Env mapping | `BA_CLIENT_ID` in `apps/api/src/env.ts` (default `jobboerse-jobsuche`) |
| Registration | None — the client id is embedded in the public Jobsuche frontend |
| Invalid key | HTTP **403**, empty body (verified 2026-09-20) |

`BA_CLIENT_ID=jobboerse-jobsuche` **still works** (list + detail both returned
200 with this value).

Example:

```bash
curl -H "X-API-Key: jobboerse-jobsuche" \
  "https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v6/jobs?was=softwareentwickler&wo=Berlin&size=2"
```

## Endpoints

### Search — `GET /pc/v6/jobs` (preferred)

Returns a paginated `ergebnisliste`. **This is the endpoint the adapter should
use.** Verified working 2026-09-20.

Response top-level keys (v6, live): `ergebnisliste`, `maxErgebnisse`, `page`,
`size`, `woOutput`, `facetten`.

> **Schema drift:** The bundesAPI OpenAPI spec documents v4 search responses with
> a `stellenangebote` array and fields like `refnr`, `arbeitgeber`, `arbeitsort`.
> The **v6** response uses different field names (`referenznummer`, `firma`,
> `stellenlokationen`, …). Do not assume the OpenAPI `JobSearchResponse` schema
> applies to v6 without mapping.

### Search — legacy v4 paths (avoid)

| Path | Status (2026-09-20) |
| --- | --- |
| `GET /pc/v4/jobs` | **403** |
| `GET /pc/v4/app/jobs` | **403** |

Documented in the OpenAPI spec and older examples, but blocked from this
environment. Prefer v6 only.

### Job details — `GET /pc/v4/jobdetails/{encryptedJobCode}` (required)

| Item | Value |
| --- | --- |
| Path param | `encryptedJobCode` = standard Base64 of the UTF-8 `referenznummer` (no URL-safe variant) |
| Example | `10001-1003644689-S` → `MTAwMDEtMTAwMzY0NDY4OS1T` |
| Returns | Full job including `stellenangebotsBeschreibung` (Markdown) |

v3 (`/pc/v3/jobdetails/…`) exists but v4 is documented as recommended
([openapi.yaml](https://github.com/bundesAPI/jobsuche-api/blob/main/openapi.yaml)).

**Second call per job is required.** The v6 list response contains title,
employer, location, salary hints, and remote flags, but **no description
field**. Skill extraction needs the detail response.

### Employer logo — optional

```
GET https://rest.arbeitsagentur.de/vermittlung/ag-darstellung-service/ct/v1/arbeitgeberlogo/{arbeitgeberKundennummerHash}
Header: X-API-Key: jobboerse-jobsuche
```

404 = no logo. Not needed for Phase 1 `NormalizedJob` mapping.

## Query parameters (search)

From [openapi.yaml](https://github.com/bundesAPI/jobsuche-api/blob/main/openapi.yaml)
(`/pc/v6/jobs`). All optional unless noted.

| Parameter | Type | Description |
| --- | --- | --- |
| `was` | string | Job title / keyword free text |
| `wo` | string | Location free text |
| `berufsfeld` | string | Occupation field free text |
| `umkreis` | integer | Radius in km around `wo` (e.g. 25, 50, 200) |
| `page` | integer | Page number (1-based) |
| `size` | integer | Results per page |
| `veroeffentlichtseit` | integer | Posted within last N days (0–100) |
| `angebotsart` | integer | `1`=Arbeit, `2`=Selbständigkeit, `4`=Ausbildung, `34`=Praktikum |
| `arbeitszeit` | string | Semicolon-separated: `vz`, `tz`, `snw`, `ho`, `mj` |
| `befristung` | string | `1`=befristet, `2`=unbefristet (semicolon-separated OK) |
| `arbeitgeber` | string | Employer name filter |
| `zeitarbeit` | boolean | Include temp-agency jobs (default true) |
| `behinderung` | boolean | Suitable for disabled applicants |
| `corona` | boolean | Corona-context jobs only |

There is **no documented sort parameter**. Result order is server-defined
(relevance / distance when `wo`+`umkreis` are set).

### Suggested adapter search profile (Phase 1)

For the initial BA ingestion run (≥ 200 jobs, developer-focused):

```
was=softwareentwickler
wo=Berlin          # or configurable later
umkreis=50
veroeffentlichtseit=30
angebotsart=1
page=1..N
size=100           # max practical page size — verify upstream accepts 100
```

Paginate until `page * size >= maxErgebnisse` or the run target is met.

## Pagination

| Response field | Meaning |
| --- | --- |
| `maxErgebnisse` | Total hits for this query |
| `page` | Current page (integer in v6; OpenAPI shows string for v4) |
| `size` | Page size |

Stop when `(page - 1) * size + len(ergebnisliste) >= maxErgebnisse` or the
list is empty.

## Error responses

| Condition | HTTP | Body |
| --- | --- | --- |
| Invalid / missing `X-API-Key` | 403 | Empty |
| Unknown detail ref | Not tested | — |
| Logo not found | 404 | Empty (per spec) |

No structured error JSON was observed. The adapter should treat non-2xx as
transient (retry with backoff) except 403 on auth misconfiguration.

## Rate limits and polite cadence

**No rate limit is documented** in the OpenAPI spec or BA terms.

Informal probe (5 sequential list requests, 2026-09-20): all **200**, ~800 ms
each. No `Retry-After` header observed.

BA Nutzungsbedingungen §2a(3) forbids activity that causes high infrastructure
load and explicitly bans robots/spiders used to scrape portal content for
collection/evaluation ([Nutzungsbedingungen](https://www.arbeitsagentur.de/nutzungsbedingungen)).
In 2021 the BA stated the Jobsuche API was not intended for mass automated
access ([netzpolitik.org](https://netzpolitik.org/2021/open-data-arbeitsagentur-kaempft-gegen-offene-schnittstelle/)).

**Recommendation for JobFinder:**

- Enqueue fetches through BullMQ with **concurrency 1** for BA and a **≥ 1 s
  delay** between list/detail calls (configurable in the fetch worker).
- Cap per-run volume (Phase 1 exit: ≥ 200, not unbounded).
- Retry 5xx / network errors with exponential backoff; do not hammer on 403.

## Licensing and personal self-hosted use

| Question | Finding |
| --- | --- |
| Open-data licence? | **No.** Not dl-de, not Creative Commons. |
| Copyright | BA asserts copyright on portal content (Nutzungsbedingungen §3). |
| Intended use | Arbeitsvermittlung (job placement); employers grant BA a simple usage right for placement purposes (§6b). |
| Automation | §2a(3): robots/spiders and misuse of APIs for data collection are prohibited. |
| Commercial use / redistribution | Not granted; storing and republishing listings beyond personal job search is legally grey. |
| Enforcement | BA objected to public API docs in 2021 but did not threaten legal action ([netzpolitik.org](https://netzpolitik.org/2021/open-data-arbeitsagentur-kaempft-gegen-offene-schnittstelle/)). |

**JobFinder context:** single-user, self-hosted, personal job matching — aligned
with placement purpose, but still technically automated bulk fetch. Mitigations:
private instance, no public republication of raw BA data, conservative request
rate, store only what the user needs for matching. This is a **grey zone**, not
compliance with open-data terms. Revisit if the BA publishes an official API or
cease-and-desist.

## Field mapping: BA → `NormalizedJob`

Target type: `packages/types/src/job.ts` (`NormalizedJob`).

### Identity and source

| `NormalizedJob` | BA source | Notes |
| --- | --- | --- |
| `source` | constant | `"ba"` |
| `externalId` | `referenznummer` | Stable per listing, e.g. `10001-1003644689-S`. Same value as v4 `refnr` in older schema. |

### From list (`/pc/v6/jobs` → `ergebnisliste[]`) — partial row

| `NormalizedJob` | BA field (v6) | Notes |
| --- | --- | --- |
| `title` | `stellenangebotsTitel` | |
| `company` | `firma` | Nullable in practice? Treat missing as `null`. |
| `location` | `stellenlokationen[0].adresse` | Format: `{ort}, {region}` or include `plz` if present. Multiple locations → join or take first. |
| `countryCode` | `stellenlokationen[0].adresse.land` | Map `DEUTSCHLAND` → `"DE"`. |
| `remoteType` | `homeofficemoeglich`, `homeofficetyp` | See mapping table below. |
| `employmentType` | `arbeitszeitVollzeit`, `arbeitszeitTeilzeit*`, `istGeringfuegigeBeschaeftigung` | See mapping table below. |
| `salary` | `verguetungsangabe`, `gehaltsspanneVon`, `gehaltsspanneBis`, `artDerVerguetung` | See mapping table below. |
| `postedAt` | `veroeffentlichungszeitraum.von` or `datumErsteVeroeffentlichung` | ISO date `YYYY-MM-DD` → append `T00:00:00.000Z` or parse as date-only. |
| `url` | `externeURL` or constructed | Prefer `externeURL` when present; else `https://www.arbeitsagentur.de/jobsuche/jobdetail/{referenznummer}` |
| `descriptionRaw` | — | **Not in list.** Fetch detail. |
| `descriptionText` | — | **Not in list.** Fetch detail. |

### From detail (`/pc/v4/jobdetails/{base64(referenznummer)}`) — enrich text

| `NormalizedJob` | BA field (detail) | Notes |
| --- | --- | --- |
| `descriptionRaw` | `stellenangebotsBeschreibung` | Markdown (headings, lists). Store as-is. |
| `descriptionText` | `stellenangebotsBeschreibung` | Strip Markdown to plain text for Ollama extraction/embedding. |
| `title` | `stellenangebotsTitel` | Prefer detail if list omitted it. |
| `company` | `firma` | |
| `location` | `stellenlokationen[0].adresse` | Same as list. |
| `countryCode` | `stellenlokationen[0].adresse.land` | |
| `remoteType` | `homeofficemoeglich`, `homeofficetyp` | |
| `employmentType` | `arbeitszeitVollzeit`, flags | |
| `salary` | `gehaltsspanneVon`, `gehaltsspanneBis`, `verguetungsangabe` | |
| `postedAt` | `veroeffentlichungszeitraum.von` | |
| `url` | — | Use list `externeURL` if detail lacks it (detail fixture has none). |

### `remoteType` mapping

| BA signals | `RemoteType` |
| --- | --- |
| `homeofficemoeglich === false` | `onsite` |
| `homeofficemoeglich === true` and `homeofficetyp === "VOLLSTAENDIG"` (if seen) | `remote` |
| `homeofficemoeglich === true` (e.g. `NACH_VEREINBARUNG`) | `hybrid` |
| Missing both | `unknown` |

### `employmentType` mapping

| BA signals | `EmploymentType` |
| --- | --- |
| `istGeringfuegigeBeschaeftigung === true` | `part_time` (Minijob) |
| `arbeitszeitVollzeit === true` (and not minijob) | `full_time` |
| Any `arbeitszeitTeilzeit*` true | `part_time` |
| `stellenangebotsart === "ARBEIT"` with no time flags | `unknown` |
| `angebotsart` filter excludes apprenticeships in search | — |

Detail response also exposes `vertragsdauer` (`UNBEFRISTET` / `BEFRISTET`) —
does not map directly to `EmploymentType` (contract vs permanent is separate
from full/part time in `NormalizedJob`).

### `salary` mapping

| BA `verguetungsangabe` | Mapping |
| --- | --- |
| `KEINE_ANGABEN` | `null` |
| `JAHRESGEHALT` + `gehaltsspanneVon`/`gehaltsspanneBis` | `{ min, max, currency: "EUR", period: "year" }` |
| Hourly / other (facet `stunde`) | `{ period: "hour", … }` if numeric fields present — verify on encounter |

Fixture example: `gehaltsspanneVon: 42000`, `gehaltsspanneBis: 60000` →
`{ min: 42000, max: 60000, currency: "EUR", period: "year" }`.

## Adapter fetch flow (proposed)

```
1. GET /pc/v6/jobs?page=N&size=100&…filters
2. For each item in ergebnisliste:
     a. Map list fields → partial NormalizedJob
     b. GET /pc/v4/jobdetails/{base64(referenznummer)}
     c. Merge description + any missing fields
     d. Emit complete NormalizedJob
3. Increment page until enough jobs or maxErgebnisse exhausted
```

List-only ingestion is **insufficient** for skill extraction (no description).

## Open questions for #7 / #8 grill

1. **Detail fan-out:** 200 jobs = 200 detail requests per run. Confirm BullMQ
   rate limiter and run cap in fetch worker design.
2. **`content_hash`:** Hash `stellenangebotsBeschreibung` + title + salary fields
   from detail to skip re-enrichment on unchanged reposts?
3. **External listings:** ~35% of sample hits had `externeURL` (partner boards).
   Still fetch BA detail for description, but open `url` to the external apply link.
4. **v6-only:** Adapter should not fall back to v4 search (403). Fail fast if v6 breaks.

## Fixture notes

| File | Request | Recorded |
| --- | --- | --- |
| `jobs-list-v6.json` | `GET /pc/v6/jobs?was=softwareentwickler&wo=Berlin&umkreis=50&page=1&size=2&veroeffentlichtseit=30` | 2026-09-20 |
| `job-details-v4.json` | `GET /pc/v4/jobdetails/MTAwMDEtMTAwMzY0NDY4OS1T` (ref `10001-1003644689-S`) | 2026-09-20 |

Redact nothing — fixtures contain only public job ad data.
