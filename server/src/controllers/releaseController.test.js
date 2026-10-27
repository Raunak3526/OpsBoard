import { expect, jest, test } from '@jest/globals';

jest.unstable_mockModule('../models/Release.js', () => ({
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/Activity.js', () => ({
  default: { create: jest.fn().mockResolvedValue({}) },
}));

const { default: Release } = await import('../models/Release.js');
const { updateRelease } = await import('./releaseController.js');

const makeResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

test('allows a planned release to move into progress', async () => {
  const release = {
    _id: 'release-id',
    status: 'PLANNED',
    checklist: [],
    save: jest.fn().mockResolvedValue(undefined),
  };
  Release.findById.mockResolvedValue(release);
  const response = makeResponse();

  await updateRelease(
    { params: { id: 'release-id' }, body: { status: 'IN_PROGRESS' }, user: { _id: 'user-id' } },
    response,
  );

  expect(release.status).toBe('IN_PROGRESS');
  expect(release.save).toHaveBeenCalledTimes(1);
  expect(response.status).not.toHaveBeenCalled();
  expect(response.json).toHaveBeenCalledWith({ release });
});

test('rejects skipping from planned directly to released without persisting', async () => {
  const release = {
    _id: 'release-id',
    status: 'PLANNED',
    checklist: [{ item: 'Verify deployment', completed: true }],
    save: jest.fn(),
  };
  Release.findById.mockResolvedValue(release);
  const response = makeResponse();

  await updateRelease(
    { params: { id: 'release-id' }, body: { status: 'RELEASED' }, user: { _id: 'user-id' } },
    response,
  );

  expect(release.status).toBe('PLANNED');
  expect(release.save).not.toHaveBeenCalled();
  expect(response.status).toHaveBeenCalledWith(400);
  expect(response.json).toHaveBeenCalledWith({
    error: 'Invalid status transition from PLANNED to RELEASED',
  });
});
