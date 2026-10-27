# Manifest reference

The default location is `.regnav/manifest.json`. The same path is read at the base
and head commits. Source paths are relative to the repository root, even when the
manifest lives in a subdirectory.

The format is strict UTF-8 JSON. Unknown fields, duplicate JSON keys, invalid
references and duplicate identifiers are rejected. There must be at least one
source and one claim.

```json
{
  "schema_version": "1.0",
  "sources": [
    {
      "id": "source-policy",
      "path": "sources/fictional-policy.md",
      "title": "Fictional review policy",
      "version": "training-1"
    }
  ],
  "claims": [
    {
      "id": "claim-routine",
      "text": "Routine training records have a seven-day review target.",
      "evidence": [
        {
          "source_id": "source-policy",
          "relation": "supports",
          "pinpoint": "Section 1"
        }
      ],
      "review": {
        "reviewer": "Fictional training reviewer",
        "date": "2026-10-27",
        "note": "Synthetic declaration for the demonstration."
      }
    }
  ]
}
```

## Root

| Field | Requirement |
| --- | --- |
| `schema_version` | Exactly the string `1.0`. |
| `sources` | Non-empty array, up to 100 source objects. |
| `claims` | Non-empty array, up to 500 claim objects. |

## Sources

| Field | Requirement |
| --- | --- |
| `id` | Required stable identifier. |
| `path` | Required relative path to a regular file tracked in Git. |
| `title` | Optional descriptive title. |
| `version` | Optional recorded version label. |
| `url` | Optional absolute HTTP or HTTPS URL without whitespace or embedded credentials. Retained as metadata only and never fetched. |

Source and claim IDs share a single namespace. They must match
`[A-Za-z][A-Za-z0-9._-]{0,79}`. Preserve IDs when revising a record so changes can
be associated with the same source or proposition. Source paths must also be
unique within each manifest.

Use POSIX paths such as `sources/policy.md`, including on Windows. Absolute paths,
backslashes, traversal segments, empty or dot segments, control characters,
`.git` components and revision syntax are rejected. The target must be a regular
Git blob. Symlinks, directories and submodules are outside the supported format.

A missing tracked file is reported as an observation requiring review. It never
counts as unchanged, including when it is missing at both commits.

## Claims and evidence

| Claim field | Requirement |
| --- | --- |
| `id` | Required stable identifier, unique across the manifest. |
| `text` | Required non-empty proposition. |
| `evidence` | Required list of 1 to 100 evidence links. |
| `review` | Optional recorded review declaration. |

Every evidence link has three required fields:

| Evidence field | Meaning |
| --- | --- |
| `source_id` | Identifier of a source declared in this manifest. |
| `relation` | One of `supports`, `qualifies`, `contradicts` or `context`. |
| `pinpoint` | Non-empty reproducible location, such as a section or paragraph. |

These relations and pinpoints are supplied by the record's author. Source Watch
does not infer or validate their substantive accuracy. An unchanged record may
contain unresolved contradictory evidence. Exact duplicate links in one claim
are rejected.

## Review declaration

| Field | Requirement |
| --- | --- |
| `reviewer` | Required non-empty recorded name or identifier. |
| `date` | Required valid calendar date in `YYYY-MM-DD` form. |
| `note` | Optional explanation. |

The declaration is unauthenticated. It provides context in the report and cannot
clear an underlying change finding. If only review metadata changes, the report
shows that edit separately and may still have an `UNCHANGED` verdict for the
substantive comparison.

## Resource bounds

The manifest is limited to 1 MiB. Each source is limited to 16 MiB, and aggregate
source content in one snapshot is limited to 64 MiB. Text limits are:

| Field | Maximum length |
| --- | --- |
| Source path or title | 1,024 characters |
| Source version or reviewer | 256 characters |
| Source URL or pinpoint | 2,048 characters |
| Claim text | 8,192 characters |
| Review note | 4,096 characters |

Lengths use JavaScript string units. Empty or whitespace-only strings, malformed
Unicode and unsupported control characters are rejected. Ordinary line breaks
and tabs are permitted in prose; paths and URLs have stricter rules. Input is
rejected rather than silently truncated. JSON nesting is limited to 32 levels.

Byte fingerprints cover binary files as well as text. Formatting, encoding and
line-ending changes can therefore trigger a finding. A person assesses their
significance.

## Format relationship

The Action's manifest is its own versioned format. RegNav Evidence Ledger records
are not accepted directly. An adapter would need to map source paths and supported
fields explicitly before this Action could compare them.
