'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const defaultAllowlistPath = path.join(__dirname, 'dependency-audit-allowlist.json');

function advisoryId(value) {
  const text = typeof value === 'string' ? value : value?.url || '';
  const match = text.match(/GHSA-[a-z0-9-]+/i);
  return match ? match[0].toUpperCase() : '';
}

function parseAudit(jsonText, graph) {
  const audit = JSON.parse(jsonText);
  const counts = audit?.metadata?.vulnerabilities || {};
  const critical = Object.entries(audit?.vulnerabilities || {})
    .filter(([, issue]) => issue?.severity === 'critical')
    .map(([packageName, issue]) => ({
      graph,
      package: packageName,
      severity: issue.severity,
      advisories: issue.via.filter(item => typeof item === 'object')
        .filter(item => item.severity === 'critical')
        .map(advisoryId)
        .filter(Boolean),
    }));
  return { counts, critical };
}

function loadAllowlist(filePath = defaultAllowlistPath) {
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(config.allowlist) ? config.allowlist : [];
}

function isAllowed(finding, allowlist, today = new Date()) {
  return allowlist.some(entry => {
    if (!entry.graph || !entry.package || !entry.severity || !entry.expires || !entry.owner || !entry.justification) return false;
    if (entry.graph !== finding.graph || entry.package !== finding.package || entry.severity !== finding.severity) return false;
    if (new Date(`${entry.expires}T23:59:59Z`) < today) return false;
    const allowedAdvisories = new Set((entry.advisories || []).map(advisoryId));
    return finding.advisories.length > 0 && finding.advisories.every(id => allowedAdvisories.has(id));
  });
}

function assessAudits(audits, allowlist, today = new Date()) {
  const failures = [];
  const summaries = [];
  for (const { graph, jsonText } of audits) {
    const { counts, critical } = parseAudit(jsonText, graph);
    summaries.push({ graph, counts, critical });
    for (const finding of critical) {
      if (!isAllowed(finding, allowlist, today)) {
        failures.push(`${graph}: unallowlisted critical ${finding.package} (${finding.advisories.join(', ') || 'no advisory ID'})`);
      }
    }
  }
  return { failures, summaries };
}

function runAudit(graph, cwd) {
  const result = spawnSync('npm', ['audit', '--omit=dev', '--json'], { cwd, encoding: 'utf8' });
  if (!result.stdout) throw new Error(`${graph}: npm audit returned no JSON (${result.stderr || `exit ${result.status}`})`);
  return { graph, jsonText: result.stdout };
}

function parseArgs(args) {
  const auditFiles = [];
  for (const arg of args) {
    if (!arg.startsWith('--audit-file=')) continue;
    const [graph, filePath] = arg.slice('--audit-file='.length).split('=', 2);
    if (!graph || !filePath) throw new Error(`invalid audit fixture argument: ${arg}`);
    auditFiles.push({ graph, jsonText: fs.readFileSync(filePath, 'utf8') });
  }
  return auditFiles;
}

function main() {
  const auditFiles = parseArgs(process.argv.slice(2));
  const audits = auditFiles.length ? auditFiles : [
    runAudit('root', root),
    runAudit('functions', path.join(root, 'functions')),
  ];
  const { failures, summaries } = assessAudits(audits, loadAllowlist());
  for (const { graph, counts, critical } of summaries) {
    console.log(`AUDIT_SUMMARY graph=${graph} critical=${counts.critical || 0} high=${counts.high || 0} moderate=${counts.moderate || 0} low=${counts.low || 0} total=${counts.total || 0}`);
    critical.forEach(finding => console.log(`AUDIT_CRITICAL graph=${graph} package=${finding.package} advisories=${finding.advisories.join(',') || 'none'}`));
  }
  if (failures.length) {
    console.error('DEPENDENCY_AUDIT_POLICY_FAILED');
    failures.forEach(failure => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log('DEPENDENCY_AUDIT_POLICY_OK');
  }
}

if (require.main === module) main();

module.exports = { advisoryId, assessAudits, isAllowed, loadAllowlist, parseAudit };
