import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { currencies, exchangeRates } from '../../../database/schema/index.js';

@Injectable()
export class CurrencyService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll() {
    return this.db.select().from(currencies).orderBy(currencies.code);
  }

  async findByCode(code: string) {
    const [currency] = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.code, code.toUpperCase()))
      .limit(1);

    if (!currency) {
      throw new NotFoundException(`Currency "${code}" not found`);
    }
    return currency;
  }

  async create(data: { code: string; name: string; symbol: string; decimalPlaces?: number }) {
    const code = data.code.toUpperCase();

    const [existing] = await this.db
      .select()
      .from(currencies)
      .where(eq(currencies.code, code))
      .limit(1);

    if (existing) {
      throw new ConflictException(`Currency "${code}" already exists`);
    }

    const [created] = await this.db
      .insert(currencies)
      .values({
        code,
        name: data.name,
        symbol: data.symbol,
        decimalPlaces: data.decimalPlaces ?? 2,
      })
      .returning();

    return created;
  }

  async update(code: string, data: { name?: string; symbol?: string; decimalPlaces?: number; isActive?: boolean }) {
    const upperCode = code.toUpperCase();
    await this.findByCode(upperCode);

    const [updated] = await this.db
      .update(currencies)
      .set(data)
      .where(eq(currencies.code, upperCode))
      .returning();

    return updated;
  }

  // Exchange rates
  async getExchangeRates(tenantId: string) {
    return this.db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.tenantId, tenantId))
      .orderBy(exchangeRates.effectiveDate);
  }

  async setExchangeRate(
    tenantId: string,
    data: { fromCurrency: string; toCurrency: string; rate: string; effectiveDate: string; source?: string },
  ) {
    const [created] = await this.db
      .insert(exchangeRates)
      .values({
        tenantId,
        fromCurrency: data.fromCurrency.toUpperCase(),
        toCurrency: data.toCurrency.toUpperCase(),
        rate: data.rate,
        effectiveDate: data.effectiveDate,
        source: (data.source as 'manual' | 'api' | 'central_bank') || 'manual',
      })
      .returning();

    return created;
  }
}
