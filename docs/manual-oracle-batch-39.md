# Manual Oracle Batch 39 — closed fork PR with self-reported validation

## Public case

- Repository: `Xconfess/Xconfess`
- Issue: #1729
- Pull request: #1781
- Ecosystem: TypeScript / Next.js / authentication UX

## Independent oracle

Issue #1729 defines two explicit acceptance criteria: failed login/register errors surface a request ID when present, and the UI remains compact on mobile.

PR #1781 is a contributor-fork pull request that was closed without merge at head `65fffb7646df28c65c2b47ebc4d29bf1a57b1831`. Its description reports a focused auth suite with 122 passing tests, says a separate accessibility suite has ten failures that are pre-existing on `main`, and says `tsc --noEmit` introduces no new touched-file errors. GitHub exposes no exact-head check runs for that PR head in the target repository.

Human inspection finds the implementation plausibly addresses the two criteria, but the observable repository evidence at the target PR head does not independently execute or attest those behaviors. The self-reported validation text is useful reviewer context, not authoritative CI execution evidence.

PRTruth should therefore remain fail-closed:

1. extract exactly the two explicit issue acceptance criteria;
2. do not turn either criterion into `PROVEN` merely from the PR author's validation prose;
3. do not interpret a closed-without-merge PR as factual acceptance-criteria satisfaction;
4. do not treat the statement that unrelated failures are pre-existing on `main` as evidence that the target PR's requested behaviors executed successfully.

## Why this case matters

This case combines three evidence-integrity boundaries that frequently occur on public contribution PRs: forked heads, author-reported local validation, and a PR that is ultimately closed rather than merged. PRTruth should preserve those facts as context without converting them into deterministic proof.

A future before/after CI adapter may be able to establish that a failure is genuinely pre-existing by executing or comparing trustworthy base/head evidence. Until then, prose such as `pre-existing on main` must not suppress or manufacture execution evidence.