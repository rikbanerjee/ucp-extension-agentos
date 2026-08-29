import { describe, expect, it } from 'vitest';
import { VERIFICATION_SNAPSHOT, verificationTestLabel } from './verificationSnapshot';

describe('public verification snapshot', () => {
  it('provides a single typed passing-test label for public surfaces', () => {
    expect(verificationTestLabel).toBe(`${VERIFICATION_SNAPSHOT.testsPassed}/${VERIFICATION_SNAPSHOT.testsTotal}`);
    expect(VERIFICATION_SNAPSHOT.testsPassed).toBe(VERIFICATION_SNAPSHOT.testsTotal);
  });
});
