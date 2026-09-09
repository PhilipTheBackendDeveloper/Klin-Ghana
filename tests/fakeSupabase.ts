import type { SupabaseLike } from '../src/server/iotHandler';

type FakeError = { code?: string; message: string } | null;
type FakeResult<T = unknown> = { data: T | null; error: FakeError };

type FakeDb = {
  bins: Array<Record<string, any>>;
  telemetry: Array<Record<string, any>>;
  bin_current_state: Array<Record<string, any>>;
  devices: Array<Record<string, any>>;
  alerts: Array<Record<string, any>>;
};

class FakeQuery<T = unknown> implements PromiseLike<FakeResult<T>> {
  private action: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  private values: any;
  private filters: Array<[string, unknown]> = [];
  private notFilters: Array<[string, unknown]> = [];
  private single = false;

  constructor(private db: FakeDb, private table: keyof FakeDb, private fail?: { table: keyof FakeDb; action: string; message: string }) {}

  select(): FakeQuery<T> {
    this.action = 'select';
    return this;
  }

  insert(values: unknown): FakeQuery<T> {
    this.action = 'insert';
    this.values = values;
    return this;
  }

  update(values: unknown): FakeQuery<T> {
    this.action = 'update';
    this.values = values;
    return this;
  }

  upsert(values: unknown): FakeQuery<T> {
    this.action = 'upsert';
    this.values = values;
    return this;
  }

  eq(column: string, value: unknown): FakeQuery<T> {
    this.filters.push([column, value]);
    return this;
  }

  neq(column: string, value: unknown): FakeQuery<T> {
    this.notFilters.push([column, value]);
    return this;
  }

  limit(): FakeQuery<T> {
    return this;
  }

  async maybeSingle(): Promise<FakeResult<T>> {
    this.single = true;
    return this.execute();
  }

  then<TResult1 = FakeResult<T>, TResult2 = never>(
    onfulfilled?: ((value: FakeResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private matches(row: Record<string, any>): boolean {
    return this.filters.every(([column, value]) => row[column] === value) && this.notFilters.every(([column, value]) => row[column] !== value);
  }

  private async execute(): Promise<FakeResult<T>> {
    if (this.fail?.table === this.table && this.fail.action === this.action) {
      return { data: null, error: { message: this.fail.message } };
    }

    const rows = this.db[this.table];

    if (this.action === 'select') {
      const matched = rows.filter((row) => this.matches(row));
      if (this.single) return { data: (matched[0] as T) || null, error: matched[0] ? null : { code: 'PGRST116', message: 'No rows' } };
      return { data: matched as T, error: null };
    }

    if (this.action === 'insert') {
      const entries = Array.isArray(this.values) ? this.values : [this.values];
      if (this.table === 'telemetry') {
        const duplicate = entries.find((entry) => rows.some((row) => row.device_id === entry.device_id && row.message_id === entry.message_id));
        if (duplicate) return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
      }
      rows.push(...entries.map((entry) => ({ ...entry })));
      return { data: null, error: null };
    }

    if (this.action === 'update') {
      rows.forEach((row) => {
        if (this.matches(row)) Object.assign(row, this.values);
      });
      return { data: null, error: null };
    }

    if (this.action === 'upsert') {
      const entry = { ...this.values };
      const key = this.table === 'devices' ? 'device_id' : this.table === 'bin_current_state' ? 'bin_id' : 'id';
      const index = rows.findIndex((row) => row[key] === entry[key]);
      if (index >= 0) rows[index] = { ...rows[index], ...entry };
      else rows.push(entry);
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }
}

export function createFakeSupabase(fail?: { table: keyof FakeDb; action: string; message: string }) {
  const db: FakeDb = {
    bins: [{ id: 'bin-sb-024', code: 'SB-024', name: 'SmartBin SB-024 (Physical)' }],
    telemetry: [],
    bin_current_state: [],
    devices: [{ device_id: 'SB-024', bin_id: 'bin-sb-024', firmware_version: 'test' }],
    alerts: [],
  };

  const client: SupabaseLike & { db: FakeDb } = {
    db,
    from: (table) => new FakeQuery(db, table as keyof FakeDb, fail) as any,
  };

  return client;
}
