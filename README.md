# Optometry Academic Genealogy

An interactive, evidence-based browser for postgraduate research supervision relationships in optometry and vision science.

The current research preview includes 842 people and 836 named supervision relationships across PhD, MS, MPhil, MSc, MScOptom, MASc, MAppSci, Masters Research, Ophthalmic Doctorate, DSc and one historical graduate award whose degree was not stated. It draws on uploaded source documents and public institutional records. Public site data excludes filenames, authors, dates, page references, private source identifiers, and local document paths.

Relationships are classified as Confirmed, Supported or Provisional. The website provides filters for institution, degree, year and confidence, a conservative duplicate-name review, and a public contribution form that prepares a reviewable GitHub issue.

## Local development

```bash
pnpm install
pnpm dev
```

Run the identity audit before importing or publishing data:

```bash
pnpm audit:identities
```

The audit flags exact normalized names, initial/full-name variants, middle-name variants and reversed names. Every candidate must be merged or recorded under `duplicateReview` as distinct or unresolved. Confirmed merges retain canonical names, source aliases and identity evidence.

## Data principles

- One row or record per named supervisor-candidate relationship.
- Multiple supervisors are supported.
- Provisional identity matches are labelled.
- Confirmed identity merges retain aliases and stable canonical person IDs.
- Unnamed aggregate supervision counts are stored separately.
- Co-authorship and thesis examination do not establish supervision.
- Public evidence labels are deliberately limited to “Uploaded document” or “Public institutional record”.
