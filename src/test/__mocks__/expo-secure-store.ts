export default {
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  isAvailableAsync: jest.fn().mockResolvedValue(true),
};

export const getItemAsync = jest.fn().mockResolvedValue(null);
export const setItemAsync = jest.fn().mockResolvedValue(undefined);
export const deleteItemAsync = jest.fn().mockResolvedValue(undefined);
export const isAvailableAsync = jest.fn().mockResolvedValue(true);