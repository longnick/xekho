/**
 * Regression test: kitchen page fires new-order alert + voice while the
 * visible item list is empty when a status-filter (cooking / done) is active.
 *
 * Root cause (independent of 9789103 table-label fix):
 *   In attachListeners the onSnapshot callbacks call
 *     maybePlayNewPendingSound(buildCards({ ignoreFilter: true }))
 *   with an UNFILTERED card set, but then
 *     renderLayout(cards)                         ← uses FILTERED cards
 *   When state.filter = 'cooking' and only pending items exist:
 *     • buildCards()                 → [] (no cooking items pass the filter)
 *     • buildCards({ignoreFilter})   → [card with pending items] → alert fires
 *     • renderLayout([])             → empty-state shown
 *   Result: flashing alert + voice but nothing visible on screen.
 *
 * Fix (in kitchen.html):
 *   1. maybePlayNewPendingSound returns the count of newly detected pending keys.
 *   2. In each onSnapshot callback compute audioCards once:
 *        const audioCards = buildCards({ ignoreFilter: true });
 *        const newCount   = maybePlayNewPendingSound(audioCards);
 *        renderLayout(newCount > 0 ? audioCards : buildCards());
 *      So when an alert fires the render uses the same unfiltered card set,
 *      guaranteeing the new order is visible when the banner flashes.
 */

'use strict';

const fs  = require('fs');
const path = require('path');
const vm  = require('vm');

// ---------------------------------------------------------------------------
// Helpers: extract named top-level functions from kitchen.html by brace-match.
// Uses a paren-depth scan to skip default-parameter objects like `options = {}`
// before looking for the function-body opening brace.
// ---------------------------------------------------------------------------

const KITCHEN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'kitchen.html'),
  'utf8'
);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`function ${name} not found in kitchen.html`);

  // Skip parameter list (handles default-param objects like `options = {}`)
  let parenDepth = 0;
  let bodyStart = -1;
  for (let i = source.indexOf('(', start); i < source.length; i++) {
    if (source[i] === '(') parenDepth += 1;
    else if (source[i] === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        bodyStart = source.indexOf('{', i + 1);
        break;
      }
    }
  }
  if (bodyStart === -1) throw new Error(`no body found for ${name}`);

  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${name}`);
}

// ---------------------------------------------------------------------------
// Build a minimal sandbox wiring the six pure-logic functions under test.
// No DOM, no Firebase — just state + stubs for side effects.
// ---------------------------------------------------------------------------

function buildSandbox() {
  const state = {
    filter:  'all',
    station: 'all',
    orders:  new Map(),
    tables:  new Map(),
    seenPendingKeys: new Set(),
    settings: { kitchenVoiceNewOrderEnabled: true },
    speechQueue:  [],
    speechRunning: false,
    reminderState: new Map(),
    lastReminderSweepAt: 0,
    audioEnabled:  false,
    audioUnlocked: false,
  };

  const calls = {
    showNewOrderAlert: [],
    enqueueSpeechJob:  [],
  };

  const sb = {
    state,
    calls,

    // Fixed clock so getElapsedMs is deterministic
    Date: { now: () => 1_000_000 },

    // Side-effect stubs
    showNewOrderAlert(card, count) {
      calls.showNewOrderAlert.push({ card, count });
    },
    enqueueSpeechJob(job) {
      calls.enqueueSpeechJob.push(job);
    },
    buildNewOrderSpeechLines() { return []; },
    buildReminderSpeechLines() { return []; },

    // JS globals needed by the extracted functions
    String, Number, Array, Math, Object, Map, Set,
  };

  const funcs = [
    'isKitchenItem',
    'getKitchenLineKey',
    'getElapsedMs',
    'getItemElapsedMs',
    'getReminderLevel',
    'maybeQueueLateReminders',
    'normalizeTableName',
    'buildCards',
    'maybePlayNewPendingSound',
  ].map(n => extractFunction(KITCHEN_SRC, n)).join('\n');

  const exports = [
    'isKitchenItem',
    'getKitchenLineKey',
    'buildCards',
    'maybePlayNewPendingSound',
  ].map(n => `this.${n} = ${n};`).join('\n');

  vm.runInNewContext(`${funcs}\n${exports}`, sb);
  return sb;
}

// ---------------------------------------------------------------------------
// Order fixture with all-pending items
// ---------------------------------------------------------------------------

function makePendingOrder(id = 'ord1', tableId = '3') {
  return {
    id,
    tableId,
    status: 'open',
    items: [
      {
        id:             'item-a',
        name:           'Phở bò',
        qty:            2,
        kitchenStatus:  'pending',
        kitchenSentAt:  999_000,
        kitchenRouting: '',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// SECTION 1 – demonstrate the bug: alert fires when filtered list is empty
// ---------------------------------------------------------------------------

describe('kitchen alert/filter split-brain (ROOT CAUSE regression)', () => {
  test('BUG: with filter=cooking, buildCards() is empty but maybePlayNewPendingSound fires', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder());
    sb.state.filter = 'cooking';    // only cooking items would pass

    const filteredCards   = sb.buildCards();                         // what renderLayout sees
    const unfilteredCards = sb.buildCards({ ignoreFilter: true });   // what maybePlayNewPendingSound sees

    // Confirm the split-brain
    expect(filteredCards.length).toBe(0);     // list shown to user is empty
    expect(unfilteredCards.length).toBe(1);   // sound path sees the pending card

    sb.maybePlayNewPendingSound(unfilteredCards);
    expect(sb.calls.showNewOrderAlert.length).toBe(1);  // alert DID fire
    // → user sees flash+sound but renderLayout([]) → empty state (the bug)
  });

  test('BUG: same split-brain occurs when filter=done', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder());
    sb.state.filter = 'done';

    const filteredCards   = sb.buildCards();
    const unfilteredCards = sb.buildCards({ ignoreFilter: true });

    expect(filteredCards.length).toBe(0);
    expect(unfilteredCards.length).toBe(1);

    sb.maybePlayNewPendingSound(unfilteredCards);
    expect(sb.calls.showNewOrderAlert.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SECTION 2 – verify the FIX contract: maybePlayNewPendingSound returns newCount,
//             caller uses audioCards for renderLayout when newCount > 0.
// ---------------------------------------------------------------------------

describe('kitchen alert/filter fix: maybePlayNewPendingSound return value', () => {
  test('FIX: maybePlayNewPendingSound returns the count of newly-detected pending keys', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder('ord1', '5'));

    const audioCards = sb.buildCards({ ignoreFilter: true });
    const newCount   = sb.maybePlayNewPendingSound(audioCards);

    // After fix this must be a positive number, not undefined/void.
    expect(typeof newCount).toBe('number');
    expect(newCount).toBeGreaterThan(0);
  });

  test('FIX: returns 0 when no new pending items exist (all already seen)', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder('ord1', '5'));

    const audioCards = sb.buildCards({ ignoreFilter: true });
    sb.maybePlayNewPendingSound(audioCards);           // first call: marks keys seen
    const second = sb.maybePlayNewPendingSound(audioCards);  // same snapshot

    expect(second).toBe(0);
  });

  test('FIX: with filter=cooking and new pending order, caller renders audioCards (list non-empty)', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder());
    sb.state.filter = 'cooking';

    // Fixed call pattern inside onSnapshot callback:
    const audioCards   = sb.buildCards({ ignoreFilter: true });
    const newCount     = sb.maybePlayNewPendingSound(audioCards);
    const displayCards = newCount > 0 ? audioCards : sb.buildCards();

    expect(sb.calls.showNewOrderAlert.length).toBe(1);   // alert still fires
    expect(displayCards.length).toBeGreaterThan(0);       // list is NOT empty
    expect(displayCards[0].orderId).toBe('ord1');
  });

  test('FIX: with filter=all and pending order, behaviour is unchanged', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder());
    sb.state.filter = 'all';

    const audioCards   = sb.buildCards({ ignoreFilter: true });
    const newCount     = sb.maybePlayNewPendingSound(audioCards);
    const displayCards = newCount > 0 ? audioCards : sb.buildCards();

    expect(newCount).toBeGreaterThan(0);
    expect(displayCards.length).toBe(1);
  });

  test('FIX: no alert, no filter bypass when orders map is empty', () => {
    const sb = buildSandbox();
    // no orders
    const audioCards   = sb.buildCards({ ignoreFilter: true });
    const newCount     = sb.maybePlayNewPendingSound(audioCards);
    const displayCards = newCount > 0 ? audioCards : sb.buildCards();

    expect(sb.calls.showNewOrderAlert.length).toBe(0);
    expect(newCount).toBe(0);
    expect(displayCards.length).toBe(0);
  });

  test('FIX: with filter=pending the alert fires and the pending items are also visible via filter', () => {
    // When filter='pending', filtered and unfiltered both include the new pending card,
    // so either path produces a non-empty list. After fix newCount > 0 → audioCards used,
    // which also contains the card.
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder());
    sb.state.filter = 'pending';

    const audioCards   = sb.buildCards({ ignoreFilter: true });
    const newCount     = sb.maybePlayNewPendingSound(audioCards);
    const displayCards = newCount > 0 ? audioCards : sb.buildCards();

    expect(newCount).toBeGreaterThan(0);
    expect(displayCards.length).toBe(1);
    expect(sb.calls.showNewOrderAlert.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// SECTION 3 – source structural checks: onSnapshot callbacks must use the
//             fixed pattern so render and alert share the same card set.
// ---------------------------------------------------------------------------

describe('kitchen source: onSnapshot callback uses fixed render pattern', () => {
  test('orders onSnapshot callback must use the fixed render pattern with newCount ternary', () => {
    // Fixed pattern in orders onSnapshot (non-initial fire path):
    //   const audioCards = buildCards({ ignoreFilter: true });
    //   ...
    //   newCount = maybePlayNewPendingSound(audioCards);
    //   ...
    //   renderLayout(newCount > 0 ? audioCards : buildCards());

    const src = KITCHEN_SRC;

    // Fixed pattern: maybePlayNewPendingSound is called with a pre-computed variable
    // (may appear inside an if/else block now, so use a looser check)
    const fixedCallPattern = /maybePlayNewPendingSound\(audioCards\)/;
    expect(src).toMatch(fixedCallPattern);

    // The render must use the ternary so alert + list are consistent
    const fixedRenderPattern =
      /renderLayout\(newCount\s*>\s*0\s*\?\s*audioCards\s*:\s*buildCards\(\)\)/;
    expect(src).toMatch(fixedRenderPattern);
  });

  test('maybePlayNewPendingSound must not return undefined (must return a number)', () => {
    // After the fix, the function returns either 0 (seedOnly) or newPendingKeys.length.
    // The return statement must not be a bare `return;` or implicit undefined.
    const fnBody = extractFunction(KITCHEN_SRC, 'maybePlayNewPendingSound');
    // Accept: `return newPendingKeys.length`, `return seedOnly ? 0 : newPendingKeys.length`, etc.
    expect(fnBody).toMatch(/return\b.*newPendingKeys\.length/);
  });
});

// ---------------------------------------------------------------------------
// SECTION 4 – review findings: initial snapshot / tables-only / reattach
//
// Requirements (from independent review rejection):
//   R1. Initial populated order snapshot: seed existing pending keys, no alert/voice/filter-bypass.
//   R2. Subsequent actual new pending order (orders listener): alert + speak + unfiltered render.
//   R3. Tables-only snapshot: render current filtered cards; never consume keys, alert, or bypass.
//   R4. Listener reattach: first fire of orders listener seeds without alerting.
//   R5. Preserve item/order writes and normal live alert semantics (R2).
// ---------------------------------------------------------------------------

describe('kitchen review: maybePlayNewPendingSound seedOnly option (R1 / R4)', () => {
  test('seedOnly=true seeds pending keys without firing showNewOrderAlert', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder('ord1', '3'));

    const audioCards = sb.buildCards({ ignoreFilter: true });
    // First call with seedOnly should seed the key but not alert.
    const count = sb.maybePlayNewPendingSound(audioCards, { seedOnly: true });

    expect(sb.calls.showNewOrderAlert.length).toBe(0); // R1: no alert on initial snapshot
    expect(count).toBe(0);                             // returns 0 so caller renders filtered view
    // Key must now be in seenPendingKeys so a second call won't alert either.
    const count2 = sb.maybePlayNewPendingSound(audioCards);
    expect(sb.calls.showNewOrderAlert.length).toBe(0); // still no alert
    expect(count2).toBe(0);
  });

  test('seedOnly=true with empty orders map seeds nothing and returns 0', () => {
    const sb = buildSandbox();
    const audioCards = sb.buildCards({ ignoreFilter: true });
    const count = sb.maybePlayNewPendingSound(audioCards, { seedOnly: true });
    expect(count).toBe(0);
    expect(sb.calls.showNewOrderAlert.length).toBe(0);
  });

  test('seedOnly=true does not queue an overdue reminder on initial hydration', () => {
    const sb = buildSandbox();
    const order = makePendingOrder('ord1', '3');
    order.items[0].kitchenSentAt = 1;
    sb.state.orders.set('ord1', order);
    sb.state.audioEnabled = true;
    const audioCards = sb.buildCards({ ignoreFilter: true });

    sb.maybePlayNewPendingSound(audioCards, { seedOnly: true });
    sb.maybePlayNewPendingSound(audioCards);

    expect(sb.calls.enqueueSpeechJob).toEqual([]);
  });

  test('seedOnly=false (default) still alerts for unseen pending items', () => {
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder('ord1', '3'));

    const audioCards = sb.buildCards({ ignoreFilter: true });
    const count = sb.maybePlayNewPendingSound(audioCards); // no seedOnly → normal

    expect(count).toBeGreaterThan(0);
    expect(sb.calls.showNewOrderAlert.length).toBe(1); // R2: alert fires for truly new
  });
});

describe('kitchen review: tables-only snapshot must not consume keys or alert (R3)', () => {
  test('source: tables onSnapshot callback must NOT call maybePlayNewPendingSound', () => {
    // Extract just the tableUnsub assignment block to check it in isolation.
    // We look for the pattern of the tables onSnapshot callback and assert it
    // does NOT contain a call to maybePlayNewPendingSound.
    const src = KITCHEN_SRC;

    // Locate the tables onSnapshot block by its characteristic query
    const tablesBlockStart = src.indexOf("collection(db, 'tables'), orderBy('id')");
    expect(tablesBlockStart).toBeGreaterThan(-1); // sanity: block exists

    // Find the enclosing callback body (from the snap => { opening brace)
    const arrowIdx = src.indexOf('snap =>', tablesBlockStart);
    expect(arrowIdx).toBeGreaterThan(-1);
    const openBrace = src.indexOf('{', arrowIdx);
    let depth = 0;
    let closeIdx = -1;
    for (let i = openBrace; i < src.length; i++) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    expect(closeIdx).toBeGreaterThan(-1);
    const tablesCallbackBody = src.slice(openBrace, closeIdx + 1);

    // R3: tables callback must NOT contain maybePlayNewPendingSound
    expect(tablesCallbackBody).not.toMatch(/maybePlayNewPendingSound/);
    // R3: tables callback must NOT call buildCards with ignoreFilter
    expect(tablesCallbackBody).not.toMatch(/ignoreFilter/);
    // R3: tables callback must render using normal filtered buildCards
    expect(tablesCallbackBody).toMatch(/renderLayout\s*\(\s*buildCards\s*\(\s*\)\s*\)/);
  });
});

describe('kitchen review: orders onSnapshot uses seedOnly on initial fire (R1 / R4)', () => {
  test('source: orders onSnapshot must call maybePlayNewPendingSound with seedOnly on first fire', () => {
    const src = KITCHEN_SRC;

    // Locate the orderUnsub assignment block
    const ordersBlockStart = src.indexOf("collection(db, 'orders'), where('status', '==', 'open')");
    expect(ordersBlockStart).toBeGreaterThan(-1);

    const arrowIdx = src.indexOf('snap =>', ordersBlockStart);
    expect(arrowIdx).toBeGreaterThan(-1);
    const openBrace = src.indexOf('{', arrowIdx);
    let depth = 0;
    let closeIdx = -1;
    for (let i = openBrace; i < src.length; i++) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') {
        depth -= 1;
        if (depth === 0) { closeIdx = i; break; }
      }
    }
    expect(closeIdx).toBeGreaterThan(-1);
    const ordersCallbackBody = src.slice(openBrace, closeIdx + 1);

    // R1/R4: must have an isInitial guard (a flag that distinguishes first fire)
    // The flag is set to false after first execution.
    expect(ordersCallbackBody).toMatch(/isInitial/);

    // R1/R4: on the initial path it must call seedOnly: true
    expect(ordersCallbackBody).toMatch(/seedOnly\s*:\s*true/);

    // R4: the flag must be mutated to false so subsequent fires are not seeded
    expect(ordersCallbackBody).toMatch(/isInitial\s*=\s*false/);
  });

  test('logic: seedOnly semantics prevent alert on first-fire with existing orders', () => {
    // Simulates: orders listener fires for the first time with pre-existing pending orders.
    const sb = buildSandbox();
    sb.state.orders.set('ord1', makePendingOrder('ord1', '3'));

    const audioCards = sb.buildCards({ ignoreFilter: true });
    // First fire: isInitial=true → seedOnly
    let isInitial = true;
    let newCount;
    if (isInitial) {
      newCount = sb.maybePlayNewPendingSound(audioCards, { seedOnly: true });
      isInitial = false;
    } else {
      newCount = sb.maybePlayNewPendingSound(audioCards);
    }

    expect(sb.calls.showNewOrderAlert.length).toBe(0); // R1: no alert on first fire
    expect(newCount).toBe(0);                          // R1: caller uses filtered render

    // Second fire: same orders, no new items → still no alert
    const audioCards2 = sb.buildCards({ ignoreFilter: true });
    let newCount2;
    if (isInitial) {
      newCount2 = sb.maybePlayNewPendingSound(audioCards2, { seedOnly: true });
      isInitial = false;
    } else {
      newCount2 = sb.maybePlayNewPendingSound(audioCards2);
    }
    expect(sb.calls.showNewOrderAlert.length).toBe(0);
    expect(newCount2).toBe(0);
  });

  test('logic: after initial seed, genuinely new pending order triggers alert (R2)', () => {
    const sb = buildSandbox();
    // Seed an existing order on initial fire
    sb.state.orders.set('ord1', makePendingOrder('ord1', '3'));
    let isInitial = true;
    const audio1 = sb.buildCards({ ignoreFilter: true });
    if (isInitial) {
      sb.maybePlayNewPendingSound(audio1, { seedOnly: true });
      isInitial = false;
    } else {
      sb.maybePlayNewPendingSound(audio1);
    }
    expect(sb.calls.showNewOrderAlert.length).toBe(0); // still no alert

    // Now a genuinely new order arrives
    sb.state.orders.set('ord2', makePendingOrder('ord2', '5'));
    const audio2 = sb.buildCards({ ignoreFilter: true });
    let newCount2;
    if (isInitial) {
      newCount2 = sb.maybePlayNewPendingSound(audio2, { seedOnly: true });
      isInitial = false;
    } else {
      newCount2 = sb.maybePlayNewPendingSound(audio2);
    }

    expect(sb.calls.showNewOrderAlert.length).toBe(1); // R2: alert fires for the new order
    expect(newCount2).toBeGreaterThan(0);
  });
});
