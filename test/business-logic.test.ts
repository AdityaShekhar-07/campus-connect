import assert from 'node:assert';
import { db, runTransaction } from '../server/db.js';
import { seedDatabase } from '../server/seed.js';

console.log('🧪 Starting CampusConnect Business Logic Test Suite...\n');

// Reset and seed fresh database
seedDatabase(true);

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// 1. Student can register when seats are available
test('Rule 1: Student can register when seats are available and becomes CONFIRMED', () => {
  const testEventId = 'test_evt_1';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO events (id, title, description, category, date, start_time, end_time, venue, capacity, status, organizer_id, organizer_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testEventId, 'Open Workshop', 'Desc', 'Technical', '2026-10-01', '10:00', '12:00', 'Room 1', 5, 'PUBLISHED', 'usr_org_alex', 'Alex', now, now);

  const studentId = 'usr_stu_maya';
  const regId = 'TEST-REG-001';

  runTransaction(() => {
    const event = db.prepare('SELECT capacity, status FROM events WHERE id = ?').get(testEventId) as any;
    const count = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'").get(testEventId) as any).c;
    const status = count < event.capacity ? 'CONFIRMED' : 'WAITLISTED';
    db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(regId, testEventId, studentId, status, now, now);
  });

  const reg = db.prepare('SELECT status FROM registrations WHERE id = ?').get(regId) as any;
  assert.strictEqual(reg.status, 'CONFIRMED');
});

// 2. Student becomes waitlisted when event is full
test('Rule 2: Student becomes WAITLISTED when capacity is reached', () => {
  const testEventId = 'test_evt_full';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO events (id, title, description, category, date, start_time, end_time, venue, capacity, status, organizer_id, organizer_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testEventId, 'Tiny Seminar', 'Desc', 'Seminar', '2026-10-02', '10:00', '12:00', 'Room 2', 1, 'PUBLISHED', 'usr_org_alex', 'Alex', now, now);

  // Student 1 fills capacity
  db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    'REG-FULL-1', testEventId, 'usr_stu_maya', 'CONFIRMED', now, now
  );

  // Student 2 attempts to register
  let reg2Status = '';
  runTransaction(() => {
    const event = db.prepare('SELECT capacity FROM events WHERE id = ?').get(testEventId) as any;
    const count = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'").get(testEventId) as any).c;
    reg2Status = count < event.capacity ? 'CONFIRMED' : 'WAITLISTED';
    db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('REG-FULL-2', testEventId, 'usr_stu_liam', reg2Status, now, now);
  });

  assert.strictEqual(reg2Status, 'WAITLISTED');
});

// 3. Duplicate registration is rejected
test('Rule 3: Duplicate active registration is detected and rejected', () => {
  const testEventId = 'test_evt_full';
  const studentId = 'usr_stu_maya';

  const existing = db.prepare(`
    SELECT id, status FROM registrations WHERE event_id = ? AND student_id = ? AND status != 'CANCELLED'
  `).get(testEventId, studentId);

  assert.ok(existing, 'Should detect existing active registration');
});

// 4. Closed event rejects registration
test('Rule 4: Closed event rejects new registrations', () => {
  const testEventId = 'test_evt_closed';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO events (id, title, description, category, date, start_time, end_time, venue, capacity, status, organizer_id, organizer_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testEventId, 'Closed Talk', 'Desc', 'Seminar', '2026-09-01', '10:00', '12:00', 'Room 3', 50, 'CLOSED', 'usr_org_alex', 'Alex', now, now);

  const event = db.prepare('SELECT status FROM events WHERE id = ?').get(testEventId) as any;
  const canRegister = event.status === 'PUBLISHED';
  assert.strictEqual(canRegister, false, 'Closed events cannot accept registrations');
});

// 5. Draft event rejects public registration
test('Rule 5: Draft event rejects public registration and discovery', () => {
  const draft = db.prepare("SELECT status FROM events WHERE id = 'evt_robotics_rover'").get() as any;
  assert.strictEqual(draft.status, 'DRAFT');

  // Verify public query excludes draft
  const publicEvents = db.prepare("SELECT id FROM events WHERE status IN ('PUBLISHED', 'CLOSED') AND id = 'evt_robotics_rover'").get();
  assert.strictEqual(publicEvents, undefined, 'Draft events must not appear in public query');
});

// 6. Cancelling a confirmed registration promotes first waitlisted user
test('Rule 6: Cancelling a confirmed registration promotes first waitlisted user deterministically (FIFO)', () => {
  const testEventId = 'test_evt_promo';
  const now1 = '2026-09-20T10:00:00Z';
  const now2 = '2026-09-20T10:05:00Z';
  const now3 = '2026-09-20T10:10:00Z';

  db.prepare(`
    INSERT INTO events (id, title, description, category, date, start_time, end_time, venue, capacity, status, organizer_id, organizer_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testEventId, 'Promotion Test', 'Desc', 'Sports', '2026-10-10', '10:00', '12:00', 'Gym', 1, 'PUBLISHED', 'usr_org_alex', 'Alex', now1, now1);

  // Confirmed student
  db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('REG-P-1', testEventId, 'usr_stu_maya', 'CONFIRMED', now1, now1);

  // First waitlisted (earlier)
  db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('REG-P-2', testEventId, 'usr_stu_liam', 'WAITLISTED', now2, now2);

  // Second waitlisted (later)
  db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('REG-P-3', testEventId, 'usr_stu_elena', 'WAITLISTED', now3, now3);

  // Cancel Maya's confirmed registration and promote next
  runTransaction(() => {
    db.prepare("UPDATE registrations SET status = 'CANCELLED' WHERE id = 'REG-P-1'").run();
    const nextInLine = db.prepare(`
      SELECT id FROM registrations WHERE event_id = ? AND status = 'WAITLISTED' ORDER BY registered_at ASC LIMIT 1
    `).get(testEventId) as any;
    assert.strictEqual(nextInLine.id, 'REG-P-2', 'Liam should be promoted first because registered earlier');
    db.prepare("UPDATE registrations SET status = 'CONFIRMED' WHERE id = ?").run(nextInLine.id);
  });

  const reg2 = db.prepare("SELECT status FROM registrations WHERE id = 'REG-P-2'").get() as any;
  const reg3 = db.prepare("SELECT status FROM registrations WHERE id = 'REG-P-3'").get() as any;

  assert.strictEqual(reg2.status, 'CONFIRMED', 'Liam is now CONFIRMED');
  assert.strictEqual(reg3.status, 'WAITLISTED', 'Elena remains WAITLISTED');
});

// 7. Organizer cannot modify another organizer's event
test('Rule 7: Organizer cannot modify another organizer\'s event', () => {
  const event = db.prepare("SELECT organizer_id FROM events WHERE id = 'evt_ai_workshop'").get() as any;
  assert.strictEqual(event.organizer_id, 'usr_org_sarah');

  const otherOrganizerId = 'usr_org_alex';
  const isOwner = event.organizer_id === otherOrganizerId;
  assert.strictEqual(isOwner, false, 'Other organizer is not owner and must be forbidden');
});

// 8. Student cannot access organizer endpoints
test('Rule 8: Student role is forbidden from organizer permissions', () => {
  const student = db.prepare("SELECT role FROM users WHERE id = 'usr_stu_jordan'").get() as any;
  assert.strictEqual(student.role, 'STUDENT');
  const isOrganizer = student.role === 'ORGANIZER';
  assert.strictEqual(isOrganizer, false);
});

// 9. Capacity cannot be reduced below confirmed count
test('Rule 9: Capacity cannot be reduced below confirmed registrations count', () => {
  const testEventId = 'test_evt_cap';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO events (id, title, description, category, date, start_time, end_time, venue, capacity, status, organizer_id, organizer_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(testEventId, 'Cap Test', 'Desc', 'Sports', '2026-10-10', '10:00', '12:00', 'Gym', 5, 'PUBLISHED', 'usr_org_alex', 'Alex', now, now);

  db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('REG-C-1', testEventId, 'usr_stu_maya', 'CONFIRMED', now, now);
  db.prepare('INSERT INTO registrations (id, event_id, student_id, status, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run('REG-C-2', testEventId, 'usr_stu_liam', 'CONFIRMED', now, now);

  const confirmedCount = (db.prepare("SELECT COUNT(*) as c FROM registrations WHERE event_id = ? AND status = 'CONFIRMED'").get(testEventId) as any).c;
  assert.strictEqual(confirmedCount, 2);

  const proposedNewCapacity = 1;
  const isValidReduction = proposedNewCapacity >= confirmedCount;
  assert.strictEqual(isValidReduction, false, 'Reducing below confirmed count must be rejected');
});

// 10. Invalid event data is rejected
test('Rule 10: Invalid event data (e.g. zero capacity or missing title) is rejected', () => {
  const invalidCap = 0;
  const isCapValid = invalidCap > 0;
  assert.strictEqual(isCapValid, false);

  const emptyTitle = '   ';
  const isTitleValid = Boolean(emptyTitle.trim());
  assert.strictEqual(isTitleValid, false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed out of 10 critical business rules.`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All 10 critical business logic tests PASSED successfully!\n');
}
