import { describe, expect, it } from 'vitest';
import { validateLebaneseMobile } from './lebanese-mobile';

describe('validateLebaneseMobile', () => {
  it.each([
    ['70123456', '+96170123456'],
    ['96170123456', '+96170123456'],
    ['+96170123456', '+96170123456'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(validateLebaneseMobile(input)).toEqual({
      normalized: expected,
      error: null,
    });
  });

  it.each(['69123456', '72123456', '7012345', '701234567'])(
    'rejects invalid prefix or length: %s',
    (input) => {
      expect(validateLebaneseMobile(input)).toEqual({
        normalized: null,
        error: 'Please enter a valid Lebanese mobile number.',
      });
    },
  );

  it.each(['70A23456', '70-123456', '70 123456', '++96170123456'])(
    'rejects letters and special characters: %s',
    (input) => {
      expect(validateLebaneseMobile(input)).toEqual({
        normalized: null,
        error: 'Please enter a valid Lebanese mobile number.',
      });
    },
  );
});
