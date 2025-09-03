// Service test setup and mocks
const createMockSupabaseClient = () => {
  const mockClient = {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
  };
  return mockClient;
};

const createMockQueryClient = () => ({
  invalidateQueries: jest.fn(),
  setQueryData: jest.fn(),
  getQueryData: jest.fn(),
  fetchQuery: jest.fn(),
});

module.exports = {
  createMockSupabaseClient,
  createMockQueryClient,
};