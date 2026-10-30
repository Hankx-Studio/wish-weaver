import { describe, expect, it } from 'vitest';
import { MountGuard } from '../../src/features/world/mountGuard';

describe('MountGuard', () => {
  it('keeps only the latest token current', () => {
    const guard = new MountGuard();
    const first = guard.next();
    expect(guard.isCurrent(first)).toBe(true);
    const second = guard.next();
    expect(guard.isCurrent(first)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('rejects unknown tokens', () => {
    const guard = new MountGuard();
    guard.next();
    expect(guard.isCurrent(999)).toBe(false);
  });
});
