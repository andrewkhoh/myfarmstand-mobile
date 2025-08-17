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

export const orderBroadcast = {
  send: jest.fn().mockResolvedValue({ success: true }),
  user: { 
    send: jest.fn().mockResolvedValue({ success: true }),
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-user-test']) 
  },
  admin: { 
    getAuthorizedChannelNames: jest.fn().mockReturnValue(['order-admin-test']) 
  },
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};