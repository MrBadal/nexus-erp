import { afterAll, describe, expect, it } from 'vitest';
import { createTestDb } from '../../test/db.js';
import {
  withTenantScope,
  currentTenantGuc,
  TENANT_ID_STORAGE,
  currentTenantId,
  withCurrentTenantScope,
} from './tenant-scope.js';

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

  describe('tenantId validation', () => {
    const { db, client } = createTestDb();
    afterAll(async () => {
      await client.end();
    });

    it('rejects a non-UUID tenantId before ever touching the database', async () => {
      await expect(withTenantScope(db, "'; drop table leads; --", async () => 'unreachable')).rejects.toThrow(
        /not a valid UUID/,
      );
    });

    it('rejects an empty-string tenantId', async () => {
      await expect(withTenantScope(db, '', async () => 'unreachable')).rejects.toThrow(/not a valid UUID/);
    });
  });

  describe('withCurrentTenantScope (ALS-backed, per-unit-of-work scope)', () => {
    const { db, client } = createTestDb();
    afterAll(async () => {
      await client.end();
    });

    it('throws when called with no active tenant context', async () => {
      // No TENANT_ID_STORAGE.run(...) wrapping this call -- simulates a
      // @Public() route or background code calling this by mistake.
      await expect(withCurrentTenantScope(db, async () => 'unreachable')).rejects.toThrow(
        /no tenant context is active/,
      );
    });

    it('reads tenantId from ALS and opens its own short-lived scope for it', async () => {
      const seen = await TENANT_ID_STORAGE.run({ tenantId: TENANT_A }, () =>
        withCurrentTenantScope(db, async (tx) => currentTenantGuc(tx)),
      );
      expect(seen).toBe(TENANT_A);
    });

    it('does not hold a transaction open across the ALS scope -- each call opens and closes its own', async () => {
      await TENANT_ID_STORAGE.run({ tenantId: TENANT_A }, async () => {
        expect(currentTenantId()).toBe(TENANT_A); // ALS carries the id...

        // ...but no transaction is open here -- a query against the plain
        // top-level db, not any tx, must see no GUC set. If the old
        // interceptor-holds-the-tx design had leaked through, this would see
        // TENANT_A instead of null.
        const outsideAnyScope = await currentTenantGuc(db);
        expect(outsideAnyScope).toBeNull();

        // Two separate units of work in the same request, each opening (and
        // closing) its own scope.
        const first = await withCurrentTenantScope(db, async (tx) => currentTenantGuc(tx));
        const second = await withCurrentTenantScope(db, async (tx) => currentTenantGuc(tx));
        expect(first).toBe(TENANT_A);
        expect(second).toBe(TENANT_A);
      });
    });
  });
});
