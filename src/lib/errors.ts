/**
 * Custom Error Classes for AI Study Companion
 */

export class StudentCompanionError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message);
    this.name = 'StudentCompanionError';
    this.code = code;
    this.statusCode = statusCode;
    
    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StudentCompanionError);
    }
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode
    };
  }
}

