const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const db = fs.readFileSync('db.js', 'utf8');

function assert(ok, message) { if (!ok) throw new Error(message); }

// RED: login UI must not wait for the full Firestore snapshot gate.
assert(db.includes('PHASE_LOGIN_AUTH_FAST_PATH'), 'missing fast login marker');
const signedInAt = db.indexOf("_dispatchEvent('db:signedIn'");
const presenceAt = db.indexOf('_setupPresence(user.uid');
assert(signedInAt >= 0 && presenceAt >= 0 && signedInAt < presenceAt, 'signedIn UI event must precede presence setup');
assert(app.includes('showLockScreen(true)'), 'missing PIN screen transition');
const profileReadAt = db.indexOf("uSnap = await getDoc(_doc('users', user.uid))");
const profileCheckAt = db.indexOf('if (!uSnap.exists())');
assert(profileReadAt >= 0 && profileReadAt < profileCheckAt, 'Auth callback must load users/{uid} before profile check');
assert(db.includes('async findByPinFresh('), 'missing direct Staff PIN lookup fallback');
assert(app.includes('profile = await window.DB.Staff.findByPinFresh(pin)'), 'PIN unlock must not wait for full snapshot readiness');
assert(app.includes('unlocked = await unlockPosSession(pin)'), 'PIN submit must await direct lookup fallback');

// RED: attendance writes must use one atomic path, not two sequential writes.
assert(db.includes('setDailyAndShift'), 'missing atomic attendance write API');
assert(app.includes('PHASE_ATTENDANCE_ATOMIC_WRITE'), 'missing atomic attendance marker');

// RED: checkout must atomically close shift plus daily before optional payroll expense reconciliation.
assert(db.includes('closeShiftAndDaily'), 'missing atomic checkout attendance API');
assert(app.includes('PHASE_ATTENDANCE_ATOMIC_CHECKOUT'), 'missing atomic checkout marker');
assert(app.includes('Attendance.closeShiftAndDaily'), 'checkout must call atomic daily+shift close helper');
assert(app.includes('const expenseId = `attendance_${dailyId}`'), 'missing deterministic attendance expense ID');

// RED: checkout must resolve latest own open shift across midnight, not today only.
assert(app.includes('function _findLatestOpenAttendanceShift('), 'missing overnight open-shift resolver');
assert(app.includes('PHASE_ATTENDANCE_OVERNIGHT_CHECKOUT'), 'missing overnight checkout marker');

// RED: PIN checkout must have same duplicate-submit guard as PIN check-in.
const pinCheckoutStart = app.indexOf('async function webAttendanceCheckOutFromPin()');
const pinCheckoutEnd = app.indexOf('/**', pinCheckoutStart);
const pinCheckout = pinCheckoutStart >= 0 && pinCheckoutEnd >= 0 ? app.slice(pinCheckoutStart, pinCheckoutEnd) : '';
assert(pinCheckout.includes("button?.dataset.pending === '1'"), 'PIN checkout missing pending duplicate guard');
assert(pinCheckout.includes("button.textContent = '⏳ Đang ra ca...'"), 'PIN checkout missing pending text');
assert(pinCheckout.includes('finally') && pinCheckout.includes('delete button.dataset.pending'), 'PIN checkout must restore button in finally');

console.log('auth-attendance latency wiring: PASS');
