/// <reference types="jest" />

declare global {
  namespace jest {
    interface MockedFunction<T extends (...args: any[]) => any> extends jest.Mock<ReturnType<T>, Parameters<T>> {
      mockReturnValue(value: ReturnType<T>): this;
      mockResolvedValue<TResult>(value: TResult): this;
      mockRejectedValue(value: any): this;
      mockReturnThis(): this;
    }
  }
}

export {};