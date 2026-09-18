const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  scoreObjective,
  boundedScore,
} = require('../dist/grading/grading.service');

test('TASK-046 scores exact objective answers only', () => {
  const rule = { correctKeys: ['A', 'C'] };
  assert.equal(scoreObjective(rule, { keys: ['C', 'A'] }, 2), 2);
  assert.equal(scoreObjective(rule, { keys: ['A'] }, 2), 0);
  assert.equal(scoreObjective(rule, { keys: ['A', 'B'] }, 2), 0);
});

test('TASK-046 bounds manual scores to frozen question points', () => {
  assert.equal(boundedScore(1.25, 2), 1.25);
  assert.throws(() => boundedScore(-0.01, 2), /between/);
  assert.throws(() => boundedScore(2.01, 2), /between/);
});
