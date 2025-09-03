describe('Service Only Test', () => {
  it('should pass', () => {
    expect(1 + 1).toBe(2);
  });
  
  it('should mock function', () => {
    const mockFn = jest.fn();
    mockFn.mockResolvedValue([]);
    expect(mockFn).toBeDefined();
  });
});