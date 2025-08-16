// Mock broadcast factory
export const createBroadcastHelper = jest.fn(() => ({
  send: jest.fn().mockResolvedValue({ success: true }),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
}));

export const cartBroadcast = {
  send: jest.fn().mockResolvedValue({ success: true }),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

export const productBroadcast = {
  send: jest.fn().mockResolvedValue({ success: true }),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

export const authBroadcast = {
  send: jest.fn().mockResolvedValue({ success: true }),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};