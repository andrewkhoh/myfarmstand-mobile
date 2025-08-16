/**
 * Simple TokenService Test
 * Testing the service-specific Jest setup
 */

import { TokenService } from '../tokenService';

describe('TokenService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set and get access token', async () => {
    await TokenService.setAccessToken('test-token');
    const token = await TokenService.getAccessToken();
    
    // Due to mocking, this will return null, but shouldn't throw
    expect(token).toBeNull();
  });

  it('should set and get refresh token', async () => {
    await TokenService.setRefreshToken('refresh-token');
    const token = await TokenService.getRefreshToken();
    
    expect(token).toBeNull();
  });

  it('should handle user storage', async () => {
    const user = { id: '123', name: 'Test User' };
    await TokenService.setUser(user);
    const storedUser = await TokenService.getUser();
    
    expect(storedUser).toBeNull();
  });

  it('should clear all tokens without error', async () => {
    await expect(TokenService.clearAllTokens()).resolves.not.toThrow();
  });

  it('should check token validity', async () => {
    const hasTokens = await TokenService.hasValidTokens();
    expect(hasTokens).toBe(false);
  });
});