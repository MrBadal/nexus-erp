/**
 * Client for the Ministry of Corporate Affairs "RoC-wise Company Master Data"
 * open dataset on data.gov.in (~3.67M companies). We filter server-side by
 * state + "Agriculture and Allied Activities" classification, then keep the
 * producer companies client-side (the API has no reliable name search).
 *
 * A free API key can be set via DATA_GOV_API_KEY; otherwise the public sample
 * key is used (rate-limited, fine for light use).
 */

const RESOURCE = '4dbe5667-7b6b-41d7-82af-211562424d9a';
const BASE = `https://api.data.gov.in/resource/${RESOURCE}`;
const SHARED_SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
const AGRI_CLASSIFICATION = 'Agriculture and Allied Activities';

export interface McaRecord {
  CIN?: string;
  CompanyName?: string;
  CompanyStatus?: string;
  CompanyClass?: string;
  CompanyCategory?: string;
  Registered_Office_Address?: string;
  CompanyRegistrationdate_date?: string;
  CompanyStateCode?: string;
  CompanyIndustrialClassification?: string;
  nic_code?: string;
  [k: string]: string | undefined;
}

export interface McaPage {
  records: McaRecord[];
  total: number;
}

/** Indian states/UTs as the dataset stores them (lowercase CompanyStateCode). */
export const INDIAN_STATES = [
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa',
  'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala',
  'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland',
  'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura',
  'uttar pradesh', 'uttarakhand', 'west bengal', 'delhi', 'jammu and kashmir',
  'ladakh', 'puducherry', 'chandigarh', 'andaman and nicobar islands',
  'dadra and nagar haveli', 'daman and diu', 'lakshadweep',
];

/** Fetch one page of agriculture-classified companies for a state. */
export async function fetchAgriCompanies(
  state: string,
  offset: number,
  limit: number,
): Promise<McaPage> {
  const key = process.env.DATA_GOV_API_KEY || SHARED_SAMPLE_KEY;
  const url = new URL(BASE);
  url.searchParams.set('api-key', key);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('filters[CompanyStateCode]', state.toLowerCase());
  url.searchParams.set('filters[CompanyIndustrialClassification]', AGRI_CLASSIFICATION);

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(20000) });
  if (!res.ok) {
    throw new Error(`MCA registry request failed (HTTP ${res.status})`);
  }
  const json = (await res.json()) as { records?: McaRecord[]; total?: number | string };
  return { records: json.records ?? [], total: Number(json.total ?? 0) };
}

/** True when a company name denotes a producer company (FPO/FPC). */
export function isProducerCompany(name?: string): boolean {
  return !!name && name.toUpperCase().includes('PRODUCER COMPANY');
}
