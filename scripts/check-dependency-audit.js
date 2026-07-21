'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const defaultAllowlistPath = path.join(__dirname, 'dependency-audit-allowlist.json');

/** Severities that must be allowlisted or fail the build. */
const BLOCKING_SEVERITIES = new Set(['critical', 'high']);

function advisoryId(value) {
  const text = typeof value === 'string' ? value : value?.url || '';
  const match = text.match(/GHSA-[a-z0-9-]+/i);
  return match ? match[0].toUpperCase() : '';
}

function expiryEnd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const date = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function parseAudit(jsonText, graph) {
  const audit = JSON.parse(jsonText);
  const counts = audit?.metadata?.vulnerabilities || {};
  const blocking = Object.entries(audit?.vulnerabilities || {})
    .filter(([, issue]) => BLOCKING_SEVERITIES.has(issue?.severity))
    .map(([packageName, issue]) => ({
      graph,
      package: packageName,
      severity: issue.severity,
      advisories: (Array.isArray(issue.via) ? issue.via : [])
        .filter(item => typeof item === 'object')
        .filter(item => BLOCKING_SEVERITIES.has(item.severity))
        .map(advisoryId)
        .filter(Boolean),
    }));
  return { counts, blocking };
}

function loadAllowlist(filePath = defaultAllowlistPath) {
  const config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return Array.isArray(config.allowlist) ? config.allowlist : [];
}

function isAllowed(finding, allowlist, today = new Date()) {
  return allowlist.some(entry => {
    if (!entry.graph || !entry.package || !entry.severity || !entry.expires || !entry.owner || !entry.justification) return false;
    if (entry.graph !== finding.graph || entry.package !== finding.package || entry.severity !== finding.severity) return false;
    const expires = expiryEnd(entry.expires);
    if (!expires || expires < today) return false;
    const allowedAdvisories = new Set((entry.advisories || []).map(advisoryId));
    return finding.advisories.length > 0 && finding.advisories.every(id => allowedAdvisories.has(id));
  });
}

function assessAudits(audits, allowlist, today = new Date()) {
  const failures = [];
  const summaries = [];
  for (const { graph, jsonText } of audits) {
    const { counts, blocking } = parseAudit(jsonText, graph);
    summaries.push({ graph, counts, blocking });
    for (const finding of blocking) {
      if (!isAllowed(finding, allowlist, today)) {
        failures.push(
          `${graph}: unallowlisted ${finding.severity} ${finding.package} ` +
          `(${finding.advisories.join(', ') || 'no advisory ID'})`,
        );
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
  for (const { graph, counts, blocking } of summaries) {
    console.log(
      `AUDIT_SUMMARY graph=${graph}` +
      ` critical=${counts.critical || 0}` +
      ` high=${counts.high || 0}` +
      ` moderate=${counts.moderate || 0}` +
      ` low=${counts.low || 0}` +
      ` total=${counts.total || 0}`,
    );
    blocking.forEach(finding =>
      console.log(
        `AUDIT_FINDING graph=${graph}` +
        ` severity=${finding.severity}` +
        ` package=${finding.package}` +
        ` advisories=${finding.advisories.join(',') || 'none'}`,
      ),
    );
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
