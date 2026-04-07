import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';

import { RolesGuard } from './roles.guard.js';

const mockReflector = {
  getAllAndOverride: jest.fn(),
} as unknown as Reflector;

const createContext = (user?: { role?: string }) =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard(mockReflector);
    jest.clearAllMocks();
  });

  it('returns true when route has no required roles', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    const result = guard.canActivate(createContext({ role: 'USER' }));

    expect(result).toBe(true);
  });

  it('returns true when user role is allowed', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createContext({ role: 'ADMIN' }));

    expect(result).toBe(true);
  });

  it('returns false when user role is not allowed', () => {
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);

    const result = guard.canActivate(createContext({ role: 'USER' }));

    expect(result).toBe(false);
  });
});
