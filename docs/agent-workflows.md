# AI coding-agent workflow playbook

PRTruth works best as the verification layer between an AI coding agent opening a pull request and a human or policy deciding whether that pull request is ready to merge.

It does not replace the agent, CI, or code review. It checks whether the repository evidence actually supports the issue requirements and the completion claims made in the pull request.

## Recommended flow

1. Write explicit acceptance criteria in the GitHub issue.
2. Let Codex, Claude Code, Cursor, Copilot, Gemini CLI, OpenCode, or another coding agent implement the change and open a pull request.
3. Keep normal CI running: tests, lint, typecheck, build, static analysis, compatibility checks, and any project-specific validation.
4. Run PRTruth in `report-only` mode while evaluating the signal.
5. Review `UNPROVEN` items instead of treating them as failures by default; they usually mean the repository does not yet expose deterministic evidence for the claim.
6. Move to `failures-only` or `strict` only when the repository's evidence model is mature enough for gating.

## Pull request description pattern

A useful PR description separates implementation claims from validation evidence:

```markdown
## What changed
- Added CSV export endpoint
- Restricted export to administrators

## Validation
- Unit tests pass
- Typecheck passes
- API compatibility check passes

Closes #123
```

PRTruth can fact-check supported validation claims against observed GitHub evidence. The implementation bullets are still claims: changed files or matching patch lines can help reviewers navigate to relevant code, but textual similarity alone does not prove business behavior.

## Start in report-only mode

```yaml
name: PRTruth

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

permissions:
  contents: read
  issues: read
  pull-requests: read
  checks: read
  actions: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: eissasoubhi/PRTruth@v0.1.15
        with:
          pr: ${{ github.event.pull_request.number }}
          policy: report-only
```

If the PR contains exactly one closing reference such as `Closes #123`, PRTruth can infer the issue automatically.

## Policy progression

Use `report-only` first. It produces the evidence report without blocking the pull request because a requirement remains `UNPROVEN`.

Use `failures-only` when you want deterministic contradictions or observed failed validation to block without requiring every requirement to be provable.

Use `strict` only when your repository has strong deterministic evidence for the requirements you expect PRTruth to gate. In strict mode, `UNPROVEN` is intentionally blocking.

## What to ask an agent to do

Good agent instructions make later verification easier:

- link the PR to exactly one issue when practical;
- describe completed work as concrete bullets rather than broad statements such as “everything is done”;
- list commands or CI validations that actually ran;
- do not claim compatibility, security, authorization, or edge-case coverage unless the repository has evidence that can support those claims;
- add focused tests or deterministic validation when a requirement should become provable.

## Interpreting results

### PROVEN

PRTruth found a supported deterministic evidence path for the requirement or claim. This is scoped proof, not a guarantee that the entire change is correct.

### FAILED

Observed evidence contradicts the claim or a required validation failed. Investigate the evidence before merge.

### UNPROVEN

PRTruth cannot prove the statement from the evidence it currently understands. This is deliberately different from `FAILED`.

For complex business rules, security properties, runtime behavior, or compatibility guarantees, `UNPROVEN` can be the correct answer until a dedicated deterministic adapter or check exists.

## Using PRTruth with code review

A practical review stack is:

```text
AI coding agent
      ↓
Pull request
      ↓
CI + static analysis
      ↓
PRTruth evidence verification
      ↓
Human and/or AI code review
      ↓
Merge decision
```

CI answers whether validations ran successfully. Code review evaluates implementation quality and risks. PRTruth checks whether acceptance criteria and completion claims are supported by repository evidence. These are complementary responsibilities.

## Private repositories

Use the workflow `GITHUB_TOKEN` with the minimum permissions required by the checks you want PRTruth to inspect. Avoid personal access tokens when the standard workflow token is sufficient, and never place credentials in PR descriptions or committed configuration.

## Agent-session evidence

PRTruth also includes adapters for supported agent-session artifacts. See the dedicated documentation for Codex, Claude Code, Cursor, Copilot, Gemini CLI, and OpenCode session evidence. Session evidence is one evidence source; it does not automatically prove a requirement merely because an agent says it completed the work.
