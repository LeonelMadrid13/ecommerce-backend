import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

export const PrismaPg: Mock = jest.fn().mockImplementation(() => ({}));
