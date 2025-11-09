# Backlog - Future Work

## Known Issues / Future Improvements

### Progress Persistence (Deferred)
**Issue**: Practice completion data saves to database but progress tracker may not refresh immediately
**Impact**: Low - Data is saved, UI refresh timing issue
**Fix Needed**: Investigate cache invalidation and data refresh patterns
**Priority**: Medium
**Epic**: Epic 3

### Test Infrastructure Improvements
**Issue**: 32 tests failing due to MockD1Database limitations
**Impact**: Low - Implementation verified, test mocks need enhancement
**Fix Needed**: Improve D1 mock to handle all query patterns
**Priority**: Low
**Epic**: Testing infrastructure

### Bundle Size Optimization
**Issue**: Main bundle is 712 KB (exceeds 500 KB recommendation)
**Impact**: Low - Gzips to 215 KB
**Fix Needed**: Consider code splitting, dynamic imports for Recharts
**Priority**: Low
**Epic**: Performance

### Story 3.4 UI Integration Tasks
**Issue**: Socratic Q&A components exist but not fully integrated into ChatInterface
**Tasks Remaining**:
- Wire SocraticMessageBubble into chat display
- Add discovery celebration UI
- Add Socratic mode toggle to chat header
**Priority**: Medium
**Epic**: Epic 3

### Remote Database Migration
**Issue**: Remote (production) database has 0 tables
**Action Required**: Run migrations before production deployment
**Command**: npm run db:migrate:remote (when ready)
**Priority**: High (before production)
**Epic**: Infrastructure

---
**Last Updated**: 2025-01-09
