/**
 * A stand-in for the Supabase client in route tests. Every query records what
 * it asked for and gets its answer from `respond`, so a test says what the
 * database holds without a database.
 */
export interface FakeCall {
  table: string
  op: 'select' | 'insert' | 'update' | 'delete'
  columns: string | null
  payload: unknown
  filters: [string, string, unknown][]
  single: boolean
}

export type Respond = (call: FakeCall) => { data: unknown; error: { code?: string; message?: string } | null }

class Query implements PromiseLike<ReturnType<Respond>> {
  constructor(
    private readonly call: FakeCall,
    private readonly respond: Respond,
    private readonly calls: FakeCall[]
  ) {}

  select(columns?: string) {
    if (this.call.op === 'select') this.call.columns = columns ?? '*'
    return this
  }
  insert(payload: unknown) {
    this.call.op = 'insert'
    this.call.payload = payload
    return this
  }
  update(payload: unknown) {
    this.call.op = 'update'
    this.call.payload = payload
    return this
  }
  delete() {
    this.call.op = 'delete'
    return this
  }
  private filter(kind: string, column: string, value: unknown) {
    this.call.filters.push([kind, column, value])
    return this
  }
  eq(column: string, value: unknown) {
    return this.filter('eq', column, value)
  }
  in(column: string, value: unknown) {
    return this.filter('in', column, value)
  }
  not(column: string, _op: string, value: unknown) {
    return this.filter('not', column, value)
  }
  gte(column: string, value: unknown) {
    return this.filter('gte', column, value)
  }
  is(column: string, value: unknown) {
    return this.filter('is', column, value)
  }
  order() {
    return this
  }
  limit() {
    return this
  }
  single() {
    this.call.single = true
    return this
  }
  maybeSingle() {
    this.call.single = true
    return this
  }
  then<T1 = ReturnType<Respond>, T2 = never>(
    onfulfilled?: ((value: ReturnType<Respond>) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): PromiseLike<T1 | T2> {
    this.calls.push(this.call)
    return Promise.resolve(this.respond(this.call)).then(onfulfilled, onrejected)
  }
}

export function fakeSupabase(respond: Respond) {
  const calls: FakeCall[] = []
  const client = {
    from(table: string) {
      return new Query({ table, op: 'select', columns: null, payload: null, filters: [], single: false }, respond, calls)
    },
  }
  return { client, calls }
}

/** The value a query filtered on, e.g. filterValue(call, 'eq', 'id'). */
export function filterValue(call: FakeCall, kind: string, column: string): unknown {
  return call.filters.find(([k, c]) => k === kind && c === column)?.[2]
}
