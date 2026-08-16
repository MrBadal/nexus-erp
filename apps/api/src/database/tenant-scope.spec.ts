import { afterAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../../test/db.js';
import { withTenantScope, currentTenantGuc } from './tenant-scope.js';

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

// These tests exist for their own sake (this helper must be correct before
// anything calls it) and because Phase 1b's RLS isolation suite builds on it
// being correct -- a bug here would silently undermine every case in that
// later suite. See docs/crm/02-SCHEMA-MIGRATION-DESIGN.md Part B.
describe('withTenantScope', () => {
  describe('GUC visibility', () => {
    const { db, client } = createTestDb();
    afterAll(async () => {
      await client.end();
    });

    it('sets the GUC to the given tenant inside the scoped callback', async () => {
      const seen = await withTenantScope(db, TENANT_A, async (tx) => currentTenantGuc(tx));
      expect(seen).toBe(TENANT_A);
    });

    it('clears the GUC after a successful commit', async () => {
      await withTenantScope(db, TENANT_A, async () => 'ok');
      // A fresh top-level query, outside any scope, must not see tenant A's GUC --
      // whether or not it happens to land on the same physical connection.
      const after = await currentTenantGuc(db);
      expect(after).toBeNull();
    });

    it('clears the GUC after a rollback', async () => {
      await expect(
        withTenantScope(db, TENANT_A, async () => {
          throw new Error('deliberate failure to force a rollback');
        }),
      ).rejects.toThrow('deliberate failure');

      const after = await currentTenantGuc(db);
      expect(after).toBeNull();
    });
  });

  describe('nesting', () => {
    const { db, client } = createTestDb();
    afterAll(async () => {
      await client.end();
    });

    it('does not double-open or corrupt state when called reentrantly with a different tenant', async () => {
      const seenOuterBefore = await withTenantScope(db, TENANT_A, async (tx) => {
        const before = await currentTenantGuc(tx);

        const innerSeen = await withTenantScope(db, TENANT_B, async (innerTx) => {
          return currentTenantGuc(innerTx);
        });

        const after = await currentTenantGuc(tx);
        return { before, innerSeen, after };
      });

      expect(seenOuterBefore.before).toBe(TENANT_A);
      expect(seenOuterBefore.innerSeen).toBe(TENANT_B); // inner scope correctly isolated to its own tenant
      expect(seenOuterBefore.after).toBe(TENANT_A); // outer scope resumes correctly after the nested call completes
    });
  });

  describe('pooled-connection reuse', () => {
    // max: 1 forces every call on this client onto the SAME physical
    // connection -- without this, the pool might hand out a fresh connection
    // per transaction and the test would pass for the wrong reason (never
    // actually exercising reuse). This is the case SET LOCAL exists for.
    const { db, client } = createTestDb({ max: 1 });
    afterAll(async () => {
      await client.end();
    });

    it('never leaks a prior tenant into a later scope on a reused connection', async () => {
      const seenA = await withTenantScope(db, TENANT_A, async (tx) => currentTenantGuc(tx));
      expect(seenA).toBe(TENANT_A);

      // Sequential, not concurrent -- same physical connection (max: 1),
      // reused after tenant A's transaction committed and its SET LOCAL reset.
      const seenB = await withTenantScope(db, TENANT_B, async (tx) => currentTenantGuc(tx));
      expect(seenB).toBe(TENANT_B); // not TENANT_A -- would fail if this used SET instead of SET LOCAL

      // And a third, unscoped call on the same connection sees neither.
      const seenAfter = await currentTenantGuc(db);
      expect(seenAfter).toBeNull();
    });
  });
});
