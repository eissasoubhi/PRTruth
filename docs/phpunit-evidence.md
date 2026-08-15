# PHPUnit evidence

PRTruth treats PHPUnit evidence conservatively and independently from static analysis.

The adapter recognizes PHP project signals such as `composer.json`, `composer.lock`, `phpunit.xml`, and `phpunit.xml.dist`, PHP test files such as `*Test.php` and files under `test/` or `tests/`, plus CI checks whose names explicitly indicate PHPUnit or PHP tests.

## Verdict rules

- `PROVEN` — at least one recognizable PHPUnit test check exists and every matched check completed successfully.
- `FAILED` — at least one recognizable PHPUnit test check completed with a failing conclusion.
- `UNPROVEN` — PHP/PHPUnit signals exist but no recognizable test check exists, or at least one matched check is incomplete or otherwise non-successful.
- Not applicable — no PHP/PHPUnit project, test-file, or PHPUnit-check signal is present.

A successful PHPStan, Psalm, build, or generic quality check is **not** treated as successful PHPUnit evidence. Those are separate evidence categories.

This module is intentionally standalone so future adapter integration can compose it with claim verification without weakening PRTruth's evidence semantics.
