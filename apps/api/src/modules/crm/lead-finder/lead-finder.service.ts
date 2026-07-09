import {
  Injectable,
  Inject,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, isNull, desc, ilike, inArray } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { leads, leadCandidates, users, roles } from '../../../database/schema/index.js';
import { fetchAgriCompanies, isProducerCompany, INDIAN_STATES, McaRecord } from './mca-client.js';
import type { Actor } from '../lead/lead.service.js';

export interface DiscoverDto {
  state: string;
  /** Max registry records to scan this run (bounded for responsiveness). */
  maxScan?: number;
  /** Registry offset to resume from (for "scan more"). */
  offset?: number;
}

export interface ApproveDto {
  ids: string[];
  /** userId, null = unassigned pool, or 'round_robin' across telecallers. */
  assignTo?: string | null | 'round_robin';
}

const PAGE = 100; // registry page size per API call

@Injectable()
export class LeadFinderService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  private normText(s?: string | null): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private titleCase(s: string): string {
    return s
      .split(' ')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  }

  /** Identity key used to match a company against existing leads (name + state). */
  private identityKey(name: string, state: string): string {
    return `${this.normText(name)}|${this.normText(state)}`;
  }

  /** Best-effort district from a registry address like "...,Tadkal,Gulbarga,Karnataka,585302-India". */
  private districtFromAddress(addr: string | undefined, state: string): string | null {
    if (!addr) return null;
    const parts = addr
      .replace(/-India\s*$/i, '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const si = parts.findIndex((p) => this.normText(p) === this.normText(state));
    if (si > 0) {
      // skip a trailing pincode token if it sits just before the state
      const cand = parts[si - 1];
      if (cand && !/^\d{5,6}$/.test(cand)) return cand;
      if (si > 1) return parts[si - 2];
    }
    return parts.length >= 3 ? parts[parts.length - 3] : null;
  }

  private assertState(state: string): string {
    const s = (state || '').trim().toLowerCase();
    if (!INDIAN_STATES.includes(s)) {
      throw new BadRequestException(`Unknown state "${state}". Pick one from the list.`);
    }
    return s;
  }

  private assertManager(actor: Actor): void {
    if (!actor.canAssign) {
      throw new ForbiddenException('Only managers/admins can use Lead Finder');
    }
  }

  listStates(): string[] {
    return INDIAN_STATES.map((s) => this.titleCase(s));
  }

  /**
   * Scan the MCA registry for producer companies in a state and stage the
   * net-new ones as candidates. Bounded per run; returns a cursor to continue.
   */
  async discover(tenantId: string, dto: DiscoverDto, actor: Actor) {
    this.assertManager(actor);
    const state = this.assertState(dto.state);
    const stateTitle = this.titleCase(state);
    const maxScan = Math.min(Math.max(dto.maxScan ?? 1000, PAGE), 3000);
    const startOffset = Math.max(dto.offset ?? 0, 0);

    // Existing leads in this state (dedupe target) + already-staged CINs.
    const existingLeads = await this.db
      .select({
        id: leads.id,
        name: leads.name,
        company: leads.company,
        state: leads.state,
        address: leads.address,
        registryCin: leads.registryCin,
      })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt)));
    // key -> matching lead, so we can enrich it inline when the registry has it.
    const leadByKey = new Map<string, (typeof existingLeads)[number]>();
    for (const l of existingLeads) {
      leadByKey.set(this.identityKey(l.company || l.name, l.state || ''), l);
    }

    const staged = await this.db
      .select({ cin: leadCandidates.cin, dedupeKey: leadCandidates.dedupeKey })
      .from(leadCandidates)
      .where(and(eq(leadCandidates.tenantId, tenantId), isNull(leadCandidates.deletedAt)));
    const stagedCins = new Set(staged.map((s) => (s.cin || '').toUpperCase()).filter(Boolean));
    const stagedKeys = new Set(staged.map((s) => s.dedupeKey));

    let scanned = 0;
    let total = 0;
    let producersFound = 0;
    let alreadyHave = 0;
    let enriched = 0;
    const toInsert: (typeof leadCandidates.$inferInsert)[] = [];
    const enrichUpdates: { id: string; cin: string | null; status: string | null; address: string | null }[] = [];
    const seenThisRun = new Set<string>();

    while (scanned < maxScan) {
      const page = await fetchAgriCompanies(state, startOffset + scanned, PAGE);
      total = page.total;
      if (page.records.length === 0) break;
      scanned += page.records.length;

      for (const rec of page.records) {
        if (!isProducerCompany(rec.CompanyName)) continue;
        producersFound++;
        const name = (rec.CompanyName || '').trim();
        const cin = (rec.CIN || '').trim().toUpperCase();
        const key = this.identityKey(name, state);
        if (cin && stagedCins.has(cin)) continue;
        if (stagedKeys.has(key) || seenThisRun.has(cin || key)) continue;
        const matchLead = leadByKey.get(key);
        if (matchLead) {
          alreadyHave++;
          // Enrich the existing lead inline if it isn't verified yet.
          if (!matchLead.registryCin && cin) {
            enrichUpdates.push({
              id: matchLead.id,
              cin,
              status: rec.CompanyStatus || null,
              address: matchLead.address || rec.Registered_Office_Address || null,
            });
            matchLead.registryCin = cin; // avoid double-updating within this run
            enriched++;
          }
          continue; // already a lead — enrich, don't re-stage
        }
        seenThisRun.add(cin || key);
        const district = this.districtFromAddress(rec.Registered_Office_Address, state);
        toInsert.push({
          tenantId,
          source: 'mca',
          name: name.slice(0, 255),
          address: rec.Registered_Office_Address || null,
          city: district ? district.slice(0, 120) : null,
          state: stateTitle,
          cin: cin || null,
          companyStatus: rec.CompanyStatus || null,
          registrationDate: rec.CompanyRegistrationdate_date || null,
          classification: rec.CompanyIndustrialClassification || null,
          dedupeKey: key.slice(0, 320),
          status: 'new',
          raw: rec as Record<string, unknown>,
        });
      }
      if (startOffset + scanned >= total) break;
    }

    if (toInsert.length > 0 || enrichUpdates.length > 0) {
      await this.db.transaction(async (tx) => {
        for (let i = 0; i < toInsert.length; i += 200) {
          await tx.insert(leadCandidates).values(toInsert.slice(i, i + 200));
        }
        for (const u of enrichUpdates) {
          await tx
            .update(leads)
            .set({
              registryCin: u.cin,
              registryStatus: u.status,
              address: u.address,
              registryVerifiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(leads.id, u.id));
        }
      });
    }

    const nextOffset = startOffset + scanned;
    return {
      state: stateTitle,
      totalAgriInState: total,
      scanned,
      producersFound,
      created: toInsert.length,
      alreadyHave,
      enriched,
      nextOffset,
      hasMore: nextOffset < total,
    };
  }

  /** List staged candidates for review. */
  async listCandidates(
    tenantId: string,
    filters: { status?: string; state?: string; search?: string; limit?: number; offset?: number },
  ) {
    const conds = [eq(leadCandidates.tenantId, tenantId), isNull(leadCandidates.deletedAt)];
    conds.push(eq(leadCandidates.status, (filters.status as 'new' | 'imported' | 'rejected') || 'new'));
    if (filters.state) conds.push(eq(leadCandidates.state, this.titleCase(filters.state.toLowerCase())));
    if (filters.search) conds.push(ilike(leadCandidates.name, `%${filters.search}%`));

    return this.db
      .select()
      .from(leadCandidates)
      .where(and(...conds))
      .orderBy(desc(leadCandidates.createdAt))
      .limit(Math.min(filters.limit ?? 100, 500))
      .offset(filters.offset ?? 0);
  }

  /** Counts per status for the review tabs. */
  async candidateCounts(tenantId: string) {
    const rows = await this.db
      .select({ status: leadCandidates.status })
      .from(leadCandidates)
      .where(and(eq(leadCandidates.tenantId, tenantId), isNull(leadCandidates.deletedAt)));
    const counts = { new: 0, imported: 0, rejected: 0 };
    for (const r of rows) counts[r.status] = (counts[r.status] ?? 0) + 1;
    return counts;
  }

  /** Approve candidates → insert into leads and mark them imported. */
  async approve(tenantId: string, dto: ApproveDto, actor: Actor) {
    this.assertManager(actor);
    const ids = (dto.ids || []).filter(Boolean);
    if (ids.length === 0) throw new BadRequestException('No candidates selected');

    const cands = await this.db
      .select()
      .from(leadCandidates)
      .where(
        and(
          eq(leadCandidates.tenantId, tenantId),
          isNull(leadCandidates.deletedAt),
          eq(leadCandidates.status, 'new'),
          inArray(leadCandidates.id, ids),
        ),
      );
    if (cands.length === 0) return { approved: 0, skipped: 0, imported: [] as string[] };

    // Assignment target.
    let roundRobin: string[] = [];
    let fixed: string | null = null;
    if (dto.assignTo === 'round_robin') {
      const reps = await this.db
        .select({ id: users.id })
        .from(users)
        .innerJoin(roles, eq(users.roleId, roles.id))
        .where(and(eq(users.tenantId, tenantId), eq(roles.slug, 'telecaller'), isNull(users.deletedAt)));
      roundRobin = reps.map((r) => r.id);
    } else if (dto.assignTo) {
      if (dto.assignTo !== actor.userId && !actor.canAssign) {
        throw new ForbiddenException('You cannot assign to other users');
      }
      fixed = dto.assignTo;
    }

    // Dedupe against existing leads by identity.
    const existing = await this.db
      .select({ name: leads.name, company: leads.company, state: leads.state })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt)));
    const leadIdentity = new Set(existing.map((l) => this.identityKey(l.company || l.name, l.state || '')));

    let rr = 0;
    const imported: string[] = [];
    let skipped = 0;

    await this.db.transaction(async (tx) => {
      for (const c of cands) {
        const key = this.identityKey(c.name, c.state || '');
        if (leadIdentity.has(key)) {
          skipped++;
          await tx
            .update(leadCandidates)
            .set({ status: 'imported', updatedAt: new Date() })
            .where(eq(leadCandidates.id, c.id));
          continue;
        }
        leadIdentity.add(key);
        const assignedTo = roundRobin.length > 0 ? roundRobin[rr++ % roundRobin.length] : fixed;
        const [lead] = await tx
          .insert(leads)
          .values({
            tenantId,
            name: c.name,
            company: c.name,
            source: 'other',
            status: 'new',
            priority: 'medium',
            country: 'India',
            city: c.city,
            state: c.state,
            address: c.address,
            notes: c.cin ? `Registry CIN: ${c.cin}` : null,
            registryCin: c.cin,
            registryStatus: c.companyStatus,
            registryVerifiedAt: new Date(),
            assignedTo,
          })
          .returning({ id: leads.id });
        imported.push(lead.id);
        await tx
          .update(leadCandidates)
          .set({ status: 'imported', importedLeadId: lead.id, updatedAt: new Date() })
          .where(eq(leadCandidates.id, c.id));
      }
    });

    return { approved: imported.length, skipped, imported };
  }

  /** Reject candidates (won't resurface on re-discovery). */
  async reject(tenantId: string, ids: string[], actor: Actor) {
    this.assertManager(actor);
    const clean = (ids || []).filter(Boolean);
    if (clean.length === 0) throw new BadRequestException('No candidates selected');
    const res = await this.db
      .update(leadCandidates)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(
        and(
          eq(leadCandidates.tenantId, tenantId),
          isNull(leadCandidates.deletedAt),
          inArray(leadCandidates.id, clean),
        ),
      )
      .returning({ id: leadCandidates.id });
    return { rejected: res.length };
  }

  /**
   * Enrich existing leads in a state using already-discovered registry data:
   * matches by name+state and writes CIN + company status + address, flagging
   * struck-off companies so telecallers can skip dead orgs.
   */
  async enrichState(tenantId: string, state: string, actor: Actor) {
    this.assertManager(actor);
    const s = this.assertState(state);
    const stateTitle = this.titleCase(s);

    const registry = await this.db
      .select({
        name: leadCandidates.name,
        cin: leadCandidates.cin,
        companyStatus: leadCandidates.companyStatus,
        address: leadCandidates.address,
      })
      .from(leadCandidates)
      .where(
        and(
          eq(leadCandidates.tenantId, tenantId),
          isNull(leadCandidates.deletedAt),
          eq(leadCandidates.state, stateTitle),
        ),
      );
    if (registry.length === 0) {
      throw new BadRequestException(
        `No registry data staged for ${stateTitle} yet — run "Find" for this state first.`,
      );
    }
    const byName = new Map<string, (typeof registry)[number]>();
    for (const r of registry) byName.set(this.normText(r.name), r);

    const stateLeads = await this.db
      .select({ id: leads.id, name: leads.name, company: leads.company, address: leads.address, registryCin: leads.registryCin })
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), isNull(leads.deletedAt), eq(leads.state, stateTitle)));

    let updated = 0;
    let struckOff = 0;
    await this.db.transaction(async (tx) => {
      for (const l of stateLeads) {
        if (l.registryCin) continue; // already enriched
        const match = byName.get(this.normText(l.company || l.name));
        if (!match || !match.cin) continue;
        const isStruck = /strike/i.test(match.companyStatus || '');
        if (isStruck) struckOff++;
        await tx
          .update(leads)
          .set({
            registryCin: match.cin,
            registryStatus: match.companyStatus,
            registryVerifiedAt: new Date(),
            address: l.address || match.address || null,
            updatedAt: new Date(),
          })
          .where(eq(leads.id, l.id));
        updated++;
      }
    });

    return { state: stateTitle, leadsInState: stateLeads.length, updated, struckOff };
  }
}
