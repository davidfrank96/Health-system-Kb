# Lean Phase 00 validation

31 October 2026. Documentation-only revision; no implementation/dependency installation/cloud changes. Existing temporary validation environment from the prior packet was reused: Python 3.14, PyYAML 6.0.3 and openapi-spec-validator 0.9.0. No package install or update was run during this revision.

## Executed checks

Command from the workspace: `/tmp/kbean-phase00-doccheck/bin/python /tmp/kbean_lean_validate.py`. Disposable helper outside repository; it checks the properties listed below. `git -C Health-system-Kb diff --check` checks tracked whitespace; active added files were checked separately because Git diff omits untracked files.

| Check | Result | Limit |
| --- | --- | --- |
| OpenAPI 3.0.3 parse/schema/ref validation | PASS: 28 paths, 33 operations, 43 schemas | Contract only, every operation remains unimplemented |
| Authentication boundary and removed API scope | PASS: all operational APIs inherit staff sessions; QA uses HMAC; only minimal health routes anonymous | Runtime auth, SSR and cache behavior still need tests |
| Manual CSV/QA/source/sampling contract checks | PASS: operator import, closed input schemas, server-owned source, synchronous QA 201/200, 900s sampling | HMAC/CSV/cross-field rules require later implementation tests |
| Original packet hash manifest | PASS: all 52 archived files byte-identical | History is superseded, not current requirements |
| Requirements preservation | PASS: old baseline preserved after precedence notice; new brief prose retained in order | Malformed exported diagram CSS replaced and labeled |
| Local links and fenced Markdown blocks | PASS across active and historical docs | Diagrams not browser-rendered; external sources can change |
| Scope/ADRs/layout | PASS: documentation/OpenAPI/placeholders only; six old ADRs marked superseded; removed runtime dirs absent | No code, migrations, runtime dependencies or executable deployment config |
| Lean schema accounting | PASS: 17 application tables plus optional migrator metadata | No database created or SQL executed |
| Cost/availability/workload arithmetic | PASS using decimal currency rounding | Assumptions, not measured costs or load |
| Existing LICENSE/.gitignore and whitespace | PASS: original files byte-identical; active new prose checked | Preserved source/history formatting excluded from new-prose whitespace check |
| Limited credential-pattern screening | PASS: no matching private-key/GitHub/DO/Google-token patterns | Heuristic, not full secret/security audit |

The first arithmetic-check run failed because binary floating-point rounding placed the illustrative €47.355 value just below the half-cent boundary. The helper was corrected to Decimal/ROUND_HALF_UP; the documented €47.36 result was correct. Rerun passed. No unresolved document-validation failure remains.

## Reproduce basic contract checks

Use an existing Python environment with the validator versions above; this snippet does not install anything. Run from the repository root:

```sh
python - <<'PYTHON'
from pathlib import Path
import yaml
from openapi_spec_validator import validate
s = yaml.safe_load(Path('docs/api/openapi.yaml').read_text())
validate(s)
for path, item in s['paths'].items():
    for method, op in item.items():
        if method not in ('get', 'post', 'patch', 'put', 'delete'):
            continue
        assert op['x-implementation-status'] == 'unimplemented'
        effective = op.get('security', s['security'])
        if path.startswith('/api/v1/'):
            expected = 'QASignature' if path == '/api/v1/webhooks/qa/runs' else 'SessionCookie'
            assert effective == [{expected: []}]
print('Contract and declared private boundary valid')
PYTHON
```

Revised attachment SHA-256: `bae576115dba31f042f6213bf68f4b6ad5490f07d89c57c59e3e56e38107597c`.
OpenAPI SHA-256 at final validation: `8ba528618bb70302869ed113f47ae78ec57df28786e5a1e5f5c6e7237e43675c`.
Original snapshot manifest: [snapshot-manifest.json](../archive/phase-00-v1/snapshot-manifest.json).

## Not executed

No runtime build/unit/DB/API/provider/E2E/load/ZAP tests, probes, permission/billing-account queries, managed restore or deployment. No dependency installation, DB creation, cloud/IAM change, commit or push. Those require the appropriate later approval and implemented code. Account pricing/minimums/FX/tax/free headroom, IdP/MFA, actual inventory and recovery proof remain open. Mechanical document validation is not Phase 00 owner acceptance or production readiness.
