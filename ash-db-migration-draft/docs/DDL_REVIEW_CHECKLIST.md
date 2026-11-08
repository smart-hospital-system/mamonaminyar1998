# Review checklist

- [ ] Confirm Drizzle Kit version and journal compatibility
- [ ] Confirm PostgreSQL 17 compatibility
- [ ] Confirm schema and table names match the approved architecture
- [ ] Review foreign-key delete policies
- [ ] Review all CHECK and UNIQUE constraints
- [ ] Review index selectivity and expected query patterns
- [ ] Review append-only audit trigger limitations
- [ ] Add role-permission seed matrix
- [ ] Add database grants and ownership plan
- [ ] Add integration tests against a disposable database
- [ ] Verify migration ordering and rollback/recovery plan
- [ ] Obtain explicit execution approval before applying
