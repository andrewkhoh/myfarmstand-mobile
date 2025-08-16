export const createClient = jest.fn(() => ({
  auth: {
    getUser: jest.fn(),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
  })),
  realtime: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(),
  },
}));