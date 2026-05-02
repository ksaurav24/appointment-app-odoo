import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expandAssignmentCandidates,
  filterAssignmentsByEntityType,
} from '../../src/availability/assignment-expander.ts';
import { mixedAssignmentLinks } from '../fixtures/scenarios.ts';

test('expandAssignmentCandidates normalizes all supported assignment shapes', () => {
  const assignments = expandAssignmentCandidates('apt_assignments', mixedAssignmentLinks);

  assert.deepStrictEqual(assignments, [
    {
      key: 'apt_assignments:person_a:none',
      appointmentTypeId: 'apt_assignments',
      shape: 'person-only',
      bookablePersonId: 'person_a',
      bookableResourceId: null,
    },
    {
      key: 'apt_assignments:none:resource_a',
      appointmentTypeId: 'apt_assignments',
      shape: 'resource-only',
      bookablePersonId: null,
      bookableResourceId: 'resource_a',
    },
    {
      key: 'apt_assignments:person_b:resource_b',
      appointmentTypeId: 'apt_assignments',
      shape: 'paired',
      bookablePersonId: 'person_b',
      bookableResourceId: 'resource_b',
    },
  ]);
});

test('filterAssignmentsByEntityType enforces entity-type constraints', () => {
  const assignments = expandAssignmentCandidates('apt_assignments', mixedAssignmentLinks);

  assert.deepStrictEqual(
    filterAssignmentsByEntityType(
      {
        id: 'apt_assignments',
        organizationId: 'org_1',
        name: 'Test',
        slug: 'test',
        entityType: 'person',
        scheduleType: 'weekly',
        durationMode: 'fixed',
        durationMinutes: 30,
        manageCapacity: false,
        manualConfirmation: false,
        cancellationAllowed: true,
        rescheduleAllowed: true,
        isPublished: true,
      },
      assignments,
    ).map((assignment) => assignment.shape),
    ['person-only'],
  );

  assert.deepStrictEqual(
    filterAssignmentsByEntityType(
      {
        id: 'apt_assignments',
        organizationId: 'org_1',
        name: 'Test',
        slug: 'test',
        entityType: 'person_resource_pair',
        scheduleType: 'weekly',
        durationMode: 'fixed',
        durationMinutes: 30,
        manageCapacity: false,
        manualConfirmation: false,
        cancellationAllowed: true,
        rescheduleAllowed: true,
        isPublished: true,
      },
      assignments,
    ).map((assignment) => assignment.shape),
    ['paired'],
  );
});
