import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from '../../test/db.js';
import { tenants } from './schema/tenants.js';

// First real test for the Phase 1a harness (task 1a.1). Deliberately exercises
// the whole chain the harness exists to prove works together: the disposable
// Postgres from docker-compose.test.yml, the full 0000-0006 migration chain
// applied by global-setup, and a real Drizzle round-trip against it -- not a
// pure-function unit test that would pass even if the DB wiring were broken.
describe('disposable test database', () => {
  const { db, client } = createTestDb();

  afterAll(async () => {
    await client.end();
  });

  it('applies the full migration chain and round-trips a row', async () => {
    const [inserted] = await db
      .insert(tenants)
      .values({
        name: 'Vitest Harness Tenant',
        slug: `vitest-harness-${Date.now()}`,
        billingEmail: 'vitest@example.test',
      })
      .returning();

    expect(inserted.id).toBeTruthy();
    expect(inserted.status).toBe('trial'); // confirms the schema's default, not just that insert didn't throw

    const [fetched] = await db.select().from(tenants).where(eq(tenants.id, inserted.id));
    expect(fetched?.name).toBe('Vitest Harness Tenant');

    await db.delete(tenants).where(eq(tenants.id, inserted.id));
  });
});
