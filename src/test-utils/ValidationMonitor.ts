import { z } from 'zod';

export class ValidationMonitor {
  private validationErrors: Array<{
    timestamp: Date;
    schema: string;
    error: any;
    data: any;
  }> = [];

  validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      const result = schema.parse(data);
      return result;
    } catch (error) {
      this.validationErrors.push({
        timestamp: new Date(),
        schema: schema.description || 'unknown',
        error,
        data
      });
      throw error;
    }
  }

  async validateAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<T> {
    try {
      const result = await schema.parseAsync(data);
      return result;
    } catch (error) {
      this.validationErrors.push({
        timestamp: new Date(),
        schema: schema.description || 'unknown',
        error,
        data
      });
      throw error;
    }
  }

  getErrors() {
    return [...this.validationErrors];
  }

  clearErrors() {
    this.validationErrors = [];
  }

  hasErrors() {
    return this.validationErrors.length > 0;
  }

  getErrorCount() {
    return this.validationErrors.length;
  }

  getLastError() {
    return this.validationErrors[this.validationErrors.length - 1] || null;
  }
}