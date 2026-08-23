# Manual oracle batch 3 — Python

Batch 3 adds two public Python cases and records only evidence that can be independently inspected.

## Pydantic issue #13369 / PR #13391

The issue uses a standard template with `Initial Checks`, a free-form `Description`, and `Affected Components`. Before this batch, PRTruth treated the template checkboxes as completion requirements. That is incorrect: searching for duplicates, reading documentation, and selecting `JSON Schema` as an affected component describe issue intake metadata, not the desired post-change state.

The extractor now excludes `Initial Checks` and `Affected Components` sections. The batch intentionally leaves the free-form description unparsed rather than inventing a generic prose heuristic. The human oracle still sees the intended behavior: annotated `__pydantic_extra__` values should generate the corresponding JSON-schema value definition; PR #13391 changes generic substitution/schema handling and adds regression coverage. Until PRTruth has a sound prose-intent adapter, zero extracted requirements is safer than false requirements.

Classification: **requirement-extraction defect fixed**, with a remaining conservative prose-intent gap.

## pytest issue #14864 / PR #14865

The issue reports that on Windows sshfs/WinFsp mounts where every file has `st_ino == 0`, passing a file path to pytest can collect the entire suite. The issue includes a fenced `diff` block showing a proposed fix.

The first real PRTruth run extracted five lines from that code fence as requirements, including `return False` and `os.path.samestat(...)`. Those are implementation snippets, not issue requirements.

The generic extractor now strips fenced Markdown code before all requirement-selection passes. A regression test covers diff-style lines beginning with `-` and `+` so they cannot be mistaken for Markdown list requirements.

Independent implementation evidence is strong: PR #14865 changes `samefile_nofollow()` to return `False` when either file ID is zero and adds focused tests for normal and zero-file-ID cases. The exact PR-head `test` workflow is green across its matrix, including Windows Python 3.10 through 3.15 jobs. This supports the human assessment that the bug fix is implemented, while PRTruth deliberately does not promote free-form bug prose to `PROVEN` without a principled intent extractor.

Classification: **requirement-extraction defect fixed**, with a remaining prose-intent/model gap.

## Batch 3 findings

1. Issue-template metadata checklists must not be treated as acceptance criteria.
2. Fenced code, especially diff snippets, must be removed before Markdown list extraction.
3. Free-form bug descriptions remain a deliberate conservative boundary: no keyword or title heuristic was added merely to make these cases pass.
