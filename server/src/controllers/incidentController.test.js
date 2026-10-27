import { beforeEach, expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('../models/Incident.js', () => ({
  default: {
    create: jest.fn(),
    findById: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { create: jest.fn().mockResolvedValue({}) },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: jest.fn() },
}));

const { default: Incident } = await import('../models/Incident.js');
const { default: Activity } = await import('../models/Activity.js');
const { default: User } = await import('../models/User.js');
const { createIncident, updateIncident, reopenIncident } = await import('./incidentController.js');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  Activity.create.mockResolvedValue({});
});

test('creates an incident assigned to an active user', async () => {
  const incident = { _id: 'incident-id' };
  User.findOne.mockResolvedValue({ _id: 'active-user' });
  Incident.create.mockResolvedValue(incident);
  const response = makeResponse();

  await createIncident(
    {
      body: { title: 'API latency', description: 'Elevated latency', severity: 'HIGH', assignee: '64f000000000000000000003' },
      user: { _id: 'actor-id' },
    },
    response,
  );

  expect(Incident.create).toHaveBeenCalledWith(expect.objectContaining({ assignee: '64f000000000000000000003' }));
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith({ incident });
});

test('requires a resolution note before recording or saving incident resolution', async () => {
  const incident = {
    _id: 'incident-id',
    status: 'OPEN',
    save: jest.fn(),
  };
  Incident.findById.mockResolvedValue(incident);
  const response = makeResponse();

  await updateIncident(
    { params: { id: 'incident-id' }, body: { status: 'RESOLVED' }, user: { _id: 'actor-id' } },
    response,
  );

  expect(response.status).toHaveBeenCalledWith(400);
  expect(incident.save).not.toHaveBeenCalled();
  expect(Activity.create).not.toHaveBeenCalled();
});

test('resolves and reopens an incident through its supported workflow', async () => {
  const incident = {
    _id: 'incident-id',
    status: 'OPEN',
    save: jest.fn().mockResolvedValue(undefined),
  };
  Incident.findById.mockResolvedValue(incident);
  const resolveResponse = makeResponse();

  await updateIncident(
    {
      params: { id: 'incident-id' },
      body: { status: 'RESOLVED', resolutionNote: 'Restarted the affected service.' },
      user: { _id: 'actor-id' },
    },
    resolveResponse,
  );

  expect(incident.status).toBe('RESOLVED');
  expect(incident.resolvedAt).toBeInstanceOf(Date);
  expect(incident.resolutionNote).toBe('Restarted the affected service.');
  expect(incident.save).toHaveBeenCalledTimes(1);
  expect(resolveResponse.json).toHaveBeenCalledWith({ incident });

  const reopenResponse = makeResponse();
  await reopenIncident(
    { params: { id: 'incident-id' }, user: { _id: 'actor-id' } },
    reopenResponse,
  );

  expect(incident.status).toBe('OPEN');
  expect(incident.resolutionNote).toBeUndefined();
  expect(incident.resolvedAt).toBeUndefined();
  expect(incident.save).toHaveBeenCalledTimes(2);
  expect(reopenResponse.json).toHaveBeenCalledWith({ incident });
});
