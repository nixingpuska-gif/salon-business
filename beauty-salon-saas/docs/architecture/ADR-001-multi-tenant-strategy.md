# ADR-001: Multi-Tenant Strategy (Row-Level Security)

**Status**: ✅ Accepted

**Date**: 2026-01-22

**Deciders**: Architect Agent

---

## Context and Problem Statement

Beauty Salon SaaS Platform needs to support **10,000 tenants** (salons) with strict data isolation. We need to choose a multi-tenancy strategy that:
- Ensures complete data isolation between tenants
- Scales to 10k+ tenants
- Maintains good performance (p95 < 200ms)
- Simplifies application code
- Reduces operational complexity

## Decision Drivers

* **Security**: Data must be completely isolated between tenants
* **Scalability**: Must handle 10,000 tenants
* **Performance**: Query response time < 200ms (p95)
* **Maintenance**: Minimal operational overhead
* **Cost**: Infrastructure costs at scale
* **Development Speed**: Time to implement

---

## Considered Options

### Option 1: Separate Database per Tenant

**Description**: Each tenant gets its own PostgreSQL database.

**Pros**:
- ✅ Complete data isolation (strongest security)
- ✅ Easy to backup/restore individual tenants
- ✅ Can shard tenants across multiple servers
- ✅ No query overhead (no tenant filtering)

**Cons**:
- ❌ High operational overhead (10k databases!)
- ❌ Expensive (10k * connection pool cost)
- ❌ Difficult schema migrations (10k databases to update)
- ❌ Waste resources (many small databases)
- ❌ Slow tenant provisioning (create DB for each tenant)

**Performance**: ⭐⭐⭐⭐⭐ (no overhead)
**Scalability**: ⭐⭐ (operational nightmare at 10k)
**Maintenance**: ⭐ (very complex)

### Option 2: Separate Schema per Tenant

**Description**: All tenants in one database, each gets their own schema.

**Pros**:
- ✅ Good data isolation
- ✅ Can use search_path for tenant context
- ✅ Easier backups than separate DBs
- ✅ Better resource utilization than separate DBs

**Cons**:
- ❌ PostgreSQL performance degrades with 1000+ schemas
- ❌ Schema migrations still complex (10k schemas)
- ❌ Difficult to query across tenants (analytics)
- ❌ Still high operational overhead
- ❌ Connection pooling per schema is tricky

**Performance**: ⭐⭐⭐⭐ (slight overhead)
**Scalability**: ⭐⭐⭐ (PostgreSQL limit ~1000 schemas)
**Maintenance**: ⭐⭐ (complex migrations)

### Option 3: Shared Tables with tenant_id (Row-Level Security)

**Description**: All tenants share the same tables, filtered by `tenant_id` column. PostgreSQL RLS enforces isolation at database level.

**Pros**:
- ✅ **Chosen**: Best balance of all factors
- ✅ Scales to 10k+ tenants easily
- ✅ Single schema = simple migrations
- ✅ Database-level security (RLS policies)
- ✅ Easy cross-tenant queries (analytics, super-admin)
- ✅ Efficient resource utilization
- ✅ Fast tenant provisioning (just INSERT)
- ✅ Connection pooling works normally

**Cons**:
- ⚠️ Query overhead: every query filters by tenant_id
- ⚠️ Must index tenant_id on all queries
- ⚠️ Risk: programming error could leak data
- ⚠️ Slightly harder debugging (all data mixed)

**Performance**: ⭐⭐⭐⭐ (with proper indexes)
**Scalability**: ⭐⭐⭐⭐⭐ (10k+ tenants proven)
**Maintenance**: ⭐⭐⭐⭐⭐ (simple)

---

## Decision Outcome

**Chosen option**: **Option 3 - Row-Level Security (RLS)** with shared tables.

### Rationale

1. **Proven at Scale**: Companies like Notion, Coda, and many SaaS use RLS for 10k+ tenants
2. **Simple Operations**: Single database to maintain, one schema to migrate
3. **Performance**: With proper indexes (`tenant_id` first in composite), query overhead is minimal
4. **Security**: RLS enforced at PostgreSQL level (even if app code has bugs)
5. **Cost**: Most cost-effective at 10k tenants
6. **Development Speed**: Fastest to implement and iterate

### Implementation Details

```sql
-- Every table has tenant_id
CREATE TABLE appointments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- ... other columns
);

-- Composite index: tenant_id FIRST
CREATE INDEX idx_appointments_tenant_staff_start
  ON appointments(tenant_id, staff_id, start_at);

-- RLS Policy
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON appointments
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- Set tenant context before queries
SELECT set_config('app.tenant_id', 'uuid-here', false);
```

### Mitigations for Cons

1. **Query Overhead**: Mitigated by composite indexes with `tenant_id` first
2. **Index**: Every query MUST have `WHERE tenant_id = ?` (enforced by RLS)
3. **Programming Errors**: RLS is **last line of defense** (even if app forgets tenant filter)
4. **Debugging**: Use `tenant_id` in all logs, add helper views if needed

---

## Positive Consequences

* ✅ Fast tenant onboarding (INSERT into tenants table)
* ✅ Simple schema migrations (one migration for all tenants)
* ✅ Easy to scale horizontally (Citus extension when needed)
* ✅ Super-admin can query across tenants
* ✅ Analytics queries are simple
* ✅ Backup/restore is straightforward
* ✅ Connection pooling works normally

---

## Negative Consequences

* ⚠️ Every table must have `tenant_id` column
* ⚠️ Every index must include `tenant_id` (disk space)
* ⚠️ Must set tenant context before queries
* ⚠️ Slightly higher cognitive load (mixed data)
* ⚠️ Cannot use FOREIGN KEY across tenants (but we don't need to)

---

## Alternatives for Future Scaling

If we exceed 10k tenants or hit performance limits:

1. **Citus Extension**: Shard by `tenant_id` (horizontal scaling)
2. **Read Replicas**: For analytics and reporting
3. **Partitioning**: Partition by `tenant_id` ranges
4. **Separate Heavy Tenants**: Move top 1% to dedicated DBs

But RLS should handle 10k-50k tenants easily.

---

## Related Decisions

* ADR-002: Message Queue Selection (BullMQ)
* ADR-006: Database Platform (Supabase with PostgreSQL RLS)

---

## References

* [Supabase RLS Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
* [Multi-Tenancy with PostgreSQL RLS](https://www.citusdata.com/blog/2017/01/05/multi-tenant-row-level-security/)
* [Our Architecture Plan](../../.claude/plans/sharded-marinating-balloon.md)

---

**Decision**: ✅ RLS with Shared Tables
**Rationale**: Best balance of security, scalability, and maintainability
**Status**: Implemented in `packages/database/prisma/schema.prisma`
