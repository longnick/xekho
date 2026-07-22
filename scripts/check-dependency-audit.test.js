'use strict';

const { assessAudits } = require('./check-dependency-audit');

// ─── fixture builders ────────────────────────────────────────────────────────

function makeCriticalAudit(advisory = 'GHSA-test-0000-0000') {
  return JSON.stringify({
    metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 2, low: 3, total: 6 } },
    vulnerabilities: {
      'critical-package': {
        severity: 'critical',
        via: [{ severity: 'critical', url: `https://github.com/advisories/${advisory}` }],
      },
    },
  });
}

function makeHighAudit(advisory = 'GHSA-high-0001-0001') {
  return JSON.stringify({
    metadata: { vulnerabilities: { critical: 0, high: 1, moderate: 2, low: 3, total: 6 } },
    vulnerabilities: {
      'high-package': {
        severity: 'high',
        via: [{ severity: 'high', url: `https://github.com/advisories/${advisory}` }],
      },
    },
  });
}

function makeCleanAudit() {
  return JSON.stringify({
    metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 2, low: 5, total: 7 } },
    vulnerabilities: {},
  });
}

// ─── allowlists ──────────────────────────────────────────────────────────────

const criticalAllowlist = [{
  graph: 'functions',
  package: 'critical-package',
  severity: 'critical',
  advisories: ['GHSA-test-0000-0000'],
  expires: '2026-12-31',
  owner: 'test owner',
  justification: 'fixture only',
}];

const highAllowlist = [{
  graph: 'root',
  package: 'high-package',
  severity: 'high',
  advisories: ['GHSA-high-0001-0001'],
  expires: '2026-12-31',
  owner: 'test owner',
  justification: 'fixture only',
}];

// ─── existing critical behaviour (must stay GREEN) ───────────────────────────

describe('critical severity — existing behaviour', () => {
  test('allows only a documented, unexpired critical finding', () => {
    const result = assessAudits(
      [{ graph: 'functions', jsonText: makeCriticalAudit() }],
      criticalAllowlist,
      new Date('2026-07-10'),
    );
    expect(result.failures).toEqual([]);
  });

  test('fails a new critical advisory even when its package is allowlisted', () => {
    const result = assessAudits(
      [{ graph: 'functions', jsonText: makeCriticalAudit('GHSA-new-1111-1111') }],
      criticalAllowlist,
      new Date('2026-07-10'),
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('unallowlisted');
    expect(result.failures[0]).toContain('critical');
  });

  test('fails an expired critical exception', () => {
    const result = assessAudits(
      [{ graph: 'functions', jsonText: makeCriticalAudit() }],
      criticalAllowlist,
      new Date('2027-01-01'),
    );
    expect(result.failures).toHaveLength(1);
  });
});

// ─── high severity — new behaviour (RED until implementation is updated) ─────

describe('high severity — new blocking behaviour', () => {
  test('allows a documented, unexpired high finding', () => {
    // allowlisted high within expiry → should pass
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeHighAudit('GHSA-high-0001-0001') }],
      highAllowlist,
      new Date('2026-07-10'),
    );
    expect(result.failures).toEqual([]);
  });

  test('fails an unallowlisted high finding', () => {
    // no allowlist entry at all → must fail
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeHighAudit('GHSA-high-0001-0001') }],
      [], // empty allowlist
      new Date('2026-07-10'),
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('unallowlisted');
    expect(result.failures[0]).toContain('high');
  });

  test('fails a new advisory on an allowlisted high package', () => {
    // package is in allowlist but advisory ID differs → fail closed
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeHighAudit('GHSA-high-NEW-9999') }],
      highAllowlist,
      new Date('2026-07-10'),
    );
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('GHSA-HIGH-NEW-9999');
  });

  test('fails an expired high exception', () => {
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeHighAudit('GHSA-high-0001-0001') }],
      highAllowlist,
      new Date('2027-01-01'),
    );
    expect(result.failures).toHaveLength(1);
  });
});

// ─── summary counts — moderate/low must NOT block, must remain visible ───────

describe('summary counts', () => {
  test('moderate and low findings are not blocking', () => {
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeCleanAudit() }],
      [],
      new Date('2026-07-10'),
    );
    expect(result.failures).toEqual([]);
  });

  test('summary preserves moderate and low counts from metadata', () => {
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeCleanAudit() }],
      [],
      new Date('2026-07-10'),
    );
    expect(result.summaries).toHaveLength(1);
    const { counts } = result.summaries[0];
    expect(counts.moderate).toBe(2);
    expect(counts.low).toBe(5);
    expect(counts.total).toBe(7);
  });

  test('summary preserves moderate and low counts alongside a high finding', () => {
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeHighAudit() }],
      highAllowlist,
      new Date('2026-07-10'),
    );
    expect(result.summaries).toHaveLength(1);
    const { counts } = result.summaries[0];
    expect(counts.high).toBe(1);
    expect(counts.moderate).toBe(2);
    expect(counts.low).toBe(3);
    expect(counts.total).toBe(6);
  });
});

describe('malformed audit and allowlist metadata fail closed', () => {
  test.each(['not-a-date', '2026-02-30', '2026-7-01'])('rejects invalid expiry %s', expires => {
    const result = assessAudits(
      [{ graph: 'root', jsonText: makeHighAudit() }],
      [{ ...highAllowlist[0], expires }],
      new Date('2026-07-10'),
    );
    expect(result.failures).toHaveLength(1);
  });

  test.each([undefined, null, 'GHSA-high-0001-0001', {}])('missing/non-array via does not throw and blocks: %p', via => {
    const audit = JSON.parse(makeHighAudit());
    audit.vulnerabilities['high-package'].via = via;
    expect(() => assessAudits([{ graph: 'root', jsonText: JSON.stringify(audit) }], highAllowlist)).not.toThrow();
    const result = assessAudits([{ graph: 'root', jsonText: JSON.stringify(audit) }], highAllowlist);
    expect(result.failures).toEqual(['root: unallowlisted high high-package (no advisory ID)']);
  });

  test('failure retains package name for triage', () => {
    const result = assessAudits([{ graph: 'root', jsonText: makeHighAudit() }], []);
    expect(result.failures[0]).toContain('high-package');
  });
});
