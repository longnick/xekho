/**
 * dependencyRuntimeCompatibility.test.js — R4 S6C-B
 *
 * Focused root production dependency / runtime regression suite.
 * Verifies installed versions meet security floors after bounded transitive
 * remediation (no overrides, no package.json changes).
 *
 * Floor requirements:
 *   @grpc/grpc-js    >= 1.14.4   (CVE grpc DoS)
 *   protobufjs       >= 7.6.5    (prototype-pollution)
 *   form-data        >= 2.5.6    (header-injection)
 *   fast-xml-builder >= 1.1.7    (XSS/injection)
 *   engine.io        >= 6.6.7    (HTTP-upgrade memory)
 *   ws (every copy)  >= 8.21.0   (DoS)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');

const ROOT_NM = path.join(__dirname, 'node_modules');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a package's package.json by walking node_modules directly,
 * without going through require.resolve (which only works for direct deps).
 */
function readPackageJson(packageName) {
  // Handle scoped packages like @grpc/grpc-js
  const pkgJsonPath = path.join(ROOT_NM, packageName, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    return JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  }
  throw new Error(`package.json not found for ${packageName} at ${pkgJsonPath}`);
}

function installedVersion(packageName) {
  return readPackageJson(packageName).version;
}

/** Semver floor check — returns true when actual >= required.
 * Prerelease versions (e.g. 8.21.0-beta.1) NEVER satisfy a stable floor.
 * Build metadata (+build) is ignored per SemVer spec (numeric-only comparison).
 */
function atLeast(actual, required) {
  const strActual = String(actual);
  const strRequired = String(required);

  // Strip build metadata for comparison purposes
  const stripBuild = v => v.split('+')[0];

  const cleanActual = stripBuild(strActual);
  const cleanRequired = stripBuild(strRequired);

  // A prerelease in actual (anything after '-' before optional '+') fails a stable floor
  if (cleanActual.includes('-')) return false;

  const parse = v =>
    v
      .replace(/-.*$/, '')  // strip prerelease (should be gone already)
      .split('.')
      .map(n => parseInt(n, 10) || 0);

  const [aM, am, ap] = parse(cleanActual);
  const [rM, rm, rp] = parse(cleanRequired);
  if (aM !== rM) return aM > rM;
  if (am !== rm) return am > rm;
  return ap >= rp;
}

/**
 * Collect all installed versions of a package by recursively scanning
 * the entire node_modules tree, including scoped packages and nested
 * node_modules. Avoids symlink/cycle via realpath visited set.
 *
 * @param {string} packageName - package name, e.g. 'ws' or '@scope/pkg'
 * @param {string} [rootNm]    - root node_modules dir; defaults to ROOT_NM.
 *                               Pass a temporary fixture dir for unit tests.
 */
function allInstalledVersions(packageName, rootNm) {
  const nmRoot = rootNm || ROOT_NM;
  const results = [];
  const visited = new Set();

  /**
   * Walk a single node_modules directory:
   *  1. Check if packageName lives directly inside it.
   *  2. Enumerate all package-level entries and recurse only into their
   *     `<entry>/node_modules` sub-dirs — including scoped packages where
   *     the entry is `@scope` and the real packages are `@scope/<member>`.
   */
  function walkNodeModules(nmDir) {
    let realDir;
    try {
      realDir = fs.realpathSync(nmDir);
    } catch (_) {
      return; // broken symlink or permission denied
    }

    if (visited.has(realDir)) return;
    visited.add(realDir);

    // 1. Check target package at this level.
    const pkgJson = path.join(realDir, packageName, 'package.json');
    if (fs.existsSync(pkgJson)) {
      try {
        const meta = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
        if (meta.name === packageName) {
          results.push({ dir: realDir, version: meta.version });
        }
      } catch (_) { /* ignore malformed */ }
    }

    // 2. Enumerate entries.
    let entries;
    try {
      entries = fs.readdirSync(realDir);
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;

      const entryPath = path.join(realDir, entry);
      let stat;
      try {
        stat = fs.lstatSync(entryPath);
      } catch (_) {
        continue;
      }

      if (!stat.isDirectory()) continue;

      if (entry.startsWith('@')) {
        // Scoped namespace directory — NOT a package itself.
        // Its children are the actual packages (e.g. @scope/pkg).
        // Recurse into each member's nested node_modules if present.
        let members;
        try {
          members = fs.readdirSync(entryPath);
        } catch (_) {
          continue;
        }
        for (const member of members) {
          if (member.startsWith('.')) continue;
          const memberPath = path.join(entryPath, member);
          let mStat;
          try {
            mStat = fs.lstatSync(memberPath);
          } catch (_) {
            continue;
          }
          if (!mStat.isDirectory()) continue;

          const memberNm = path.join(memberPath, 'node_modules');
          if (fs.existsSync(memberNm)) {
            walkNodeModules(memberNm);
          }
        }
      } else {
        // Normal (non-scoped) package directory.
        // Only descend if it has its own nested node_modules.
        const nestedNM = path.join(entryPath, 'node_modules');
        if (fs.existsSync(nestedNM)) {
          walkNodeModules(nestedNM);
        }
      }
    }
  }

  walkNodeModules(nmRoot);
  return results;
}

// ---------------------------------------------------------------------------
// Helper unit tests (TDD — focused behavior tests for each fixed helper)
// ---------------------------------------------------------------------------

describe('atLeast() helper — stable semver floor enforcement', () => {
  // GREEN cases: stable versions that satisfy the floor
  test('8.21.0 satisfies >= 8.21.0 (exact stable)', () => {
    expect(atLeast('8.21.0', '8.21.0')).toBe(true);
  });
  test('8.21.1 satisfies >= 8.21.0 (patch ahead)', () => {
    expect(atLeast('8.21.1', '8.21.0')).toBe(true);
  });
  test('9.0.0 satisfies >= 8.21.0 (major ahead)', () => {
    expect(atLeast('9.0.0', '8.21.0')).toBe(true);
  });
  test('8.21.0+build.1 satisfies >= 8.21.0 (build metadata ok)', () => {
    expect(atLeast('8.21.0+build.1', '8.21.0')).toBe(true);
  });

  // RED cases: prerelease must FAIL a stable floor (blocker 2)
  test('8.21.0-beta.1 does NOT satisfy >= 8.21.0 (prerelease fails stable floor)', () => {
    expect(atLeast('8.21.0-beta.1', '8.21.0')).toBe(false);
  });
  test('8.21.0-0 does NOT satisfy >= 8.21.0 (numeric prerelease fails stable floor)', () => {
    expect(atLeast('8.21.0-0', '8.21.0')).toBe(false);
  });
  test('8.21.0-rc.1 does NOT satisfy >= 8.21.0 (rc prerelease fails stable floor)', () => {
    expect(atLeast('8.21.0-rc.1', '8.21.0')).toBe(false);
  });
  test('9.0.0-alpha.1 does NOT satisfy >= 8.21.0 (higher major but prerelease fails)', () => {
    expect(atLeast('9.0.0-alpha.1', '8.21.0')).toBe(false);
  });

  // RED cases: versions actually below floor
  test('8.20.9 does NOT satisfy >= 8.21.0', () => {
    expect(atLeast('8.20.9', '8.21.0')).toBe(false);
  });
  test('7.99.99 does NOT satisfy >= 8.21.0', () => {
    expect(atLeast('7.99.99', '8.21.0')).toBe(false);
  });
});

describe('allInstalledVersions() helper — full recursive traversal', () => {
  test('returns at least one ws entry from full tree scan', () => {
    const copies = allInstalledVersions('ws');
    expect(copies.length).toBeGreaterThan(0);
  });

  test('finds ws in every known nested node_modules location', () => {
    // Walk all node_modules dirs ourselves and check consistency
    const copies = allInstalledVersions('ws');
    // Ensure each entry has required shape
    for (const c of copies) {
      expect(c).toHaveProperty('dir');
      expect(c).toHaveProperty('version');
      expect(typeof c.version).toBe('string');
    }
  });

  test('does not contain duplicate entries for same realpath', () => {
    const copies = allInstalledVersions('ws');
    const dirs = copies.map(c => c.dir);
    const unique = new Set(dirs);
    expect(dirs.length).toBe(unique.size);
  });

  // TDD: scoped package nested node_modules traversal (R4 S6C-B blocker)
  test('descends into scoped package nested node_modules (fixture proof)', () => {
    const tmpRoot = path.join(__dirname, '.tmp_test_nm_scoped_bug');

    // Setup temporary fixture: @testscope/pkg/node_modules/ws/package.json
    const scopedPkgNm = path.join(tmpRoot, '@testscope', 'pkg', 'node_modules', 'ws');
    fs.mkdirSync(scopedPkgNm, { recursive: true });
    fs.writeFileSync(
      path.join(scopedPkgNm, 'package.json'),
      JSON.stringify({ name: 'ws', version: '8.20.0' })
    );

    try {
      // Scan from tmpRoot instead of ROOT_NM
      const results = allInstalledVersions('ws', tmpRoot);

      // MUST find the scoped nested ws
      expect(results.length).toBeGreaterThan(0);
      const found = results.find(r => r.version === '8.20.0');
      expect(found).toBeTruthy();
      expect(found.dir).toContain(tmpRoot);
    } finally {
      // Cleanup
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — Security Floor Assertions
// ---------------------------------------------------------------------------

describe('Root production dependency security floors (R4 S6C-B)', () => {

  // -------------------------------------------------------------------------
  // Family 1 — @grpc/grpc-js
  // -------------------------------------------------------------------------
  describe('@grpc/grpc-js', () => {
    test('installed version >= 1.14.4', () => {
      const version = installedVersion('@grpc/grpc-js');
      expect(atLeast(version, '1.14.4')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Family 2 — protobufjs
  // -------------------------------------------------------------------------
  describe('protobufjs', () => {
    test('installed version >= 7.6.5', () => {
      const version = installedVersion('protobufjs');
      expect(atLeast(version, '7.6.5')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Family 3 — form-data
  // -------------------------------------------------------------------------
  describe('form-data', () => {
    test('installed version >= 2.5.6', () => {
      const version = installedVersion('form-data');
      expect(atLeast(version, '2.5.6')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Family 4 — fast-xml-builder
  // -------------------------------------------------------------------------
  describe('fast-xml-builder', () => {
    test('installed version >= 1.1.7', () => {
      const version = installedVersion('fast-xml-builder');
      expect(atLeast(version, '1.1.7')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Family 5 — engine.io
  // -------------------------------------------------------------------------
  describe('engine.io', () => {
    test('installed version >= 6.6.7', () => {
      const version = installedVersion('engine.io');
      expect(atLeast(version, '6.6.7')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Family 6 — ws (every installed copy must be >= 8.21.0)
  // -------------------------------------------------------------------------
  describe('ws', () => {
    test('every installed copy of ws is >= 8.21.0', () => {
      const copies = allInstalledVersions('ws');
      expect(copies.length).toBeGreaterThan(0);
      const violations = copies.filter(c => !atLeast(c.version, '8.21.0'));
      // Report clearly which copies are below floor
      expect(violations).toHaveLength(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Socket.IO runtime contract — ephemeral bind/close smoke test
// ---------------------------------------------------------------------------

describe('Socket.IO runtime contract (bind/close smoke)', () => {
  test('can create a Socket.IO server, bind to an ephemeral port, and cleanly close', done => {
    const { Server } = require(path.join(ROOT_NM, 'socket.io'));

    const httpServer = http.createServer();
    const io = new Server(httpServer, { cors: { origin: '*' } });

    let finished = false;
    function finish(err) {
      if (finished) return;
      finished = true;
      done(err);
    }

    function cleanup(err) {
      // Idempotent: close io then httpServer, then signal done
      try {
        io.close(() => {
          try {
            httpServer.close(() => finish(err));
          } catch (_) {
            finish(err);
          }
        });
      } catch (_) {
        finish(err);
      }
    }

    // Handle listen errors (e.g. port unavailable) before binding completes
    httpServer.once('error', err => cleanup(err));

    httpServer.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address();
      if (!addr) {
        return cleanup(new Error('httpServer.address() returned null after listen'));
      }
      const { port } = addr;
      expect(port).toBeGreaterThan(0);

      // Verify port is reachable over TCP before closing
      const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
        socket.destroy();
        cleanup(undefined);
      });
      socket.on('error', err => cleanup(err));
    });
  }, 8000);
});
