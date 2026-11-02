import { describe, expect, it } from 'vitest';
import { fail, isFailure, isSuccess, ok, type DomainError, type Result } from './result';

const someError: DomainError = { code: 'test.failure', message: 'Something went wrong' };

describe('Result', () => {
  it('should expose the value when the operation succeeded', () => {
    const result: Result<number> = ok(42);

    expect(result).toEqual({ ok: true, value: 42 });
    expect(isSuccess(result)).toBe(true);
    expect(isFailure(result)).toBe(false);
  });

  it('should expose the error when the operation failed', () => {
    const result: Result<number> = fail(someError);

    expect(result).toEqual({ ok: false, error: someError });
    expect(isFailure(result)).toBe(true);
    expect(isSuccess(result)).toBe(false);
  });

  it('should narrow the type when checked', () => {
    const result: Result<number> = ok(1);

    if (isSuccess(result)) {
      expect(result.value + 1).toBe(2);
    } else {
      expect.unreachable();
    }
  });
});
