const { assessAudits } = require('./check-dependency-audit');

const criticalAudit = (advisory = 'GHSA-test-0000-0000') => JSON.stringify({
  metadata: { vulnerabilities: { critical: 1, high: 0, moderate: 0, low: 0, total: 1 } },
  vulnerabilities: {
    'critical-package': {
      severity: 'critical',
      via: [{ severity: 'critical', url: `https://github.com/advisories/${advisory}` }],
    },
  },
});

const allowlist = [{
  graph: 'functions',
  package: 'critical-package',
  severity: 'critical',
  advisories: ['GHSA-test-0000-0000'],
  expires: '2026-12-31',
  owner: 'test owner',
  justification: 'fixture only',
}];

describe('dependency audit policy', () => {
  test('allows only a documented, unexpired critical finding', () => {
    const result = assessAudits([{ graph: 'functions', jsonText: criticalAudit() }], allowlist, new Date('2026-07-10'));
    expect(result.failures).toEqual([]);
  });

  test('fails a new critical advisory even when its package is allowlisted', () => {
    const result = assessAudits([{ graph: 'functions', jsonText: criticalAudit('GHSA-new-1111-1111') }], allowlist, new Date('2026-07-10'));
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('unallowlisted critical');
  });

  test('fails an expired temporary exception', () => {
    const result = assessAudits([{ graph: 'functions', jsonText: criticalAudit() }], allowlist, new Date('2027-01-01'));
    expect(result.failures).toHaveLength(1);
  });
});
