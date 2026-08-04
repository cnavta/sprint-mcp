# Execution Plan – Sprint 4 (sprint-4-d9e2f1)

**Sprint**: Sprint Index System Implementation
**Goal**: Implement centralized sprint index (planning/sprint-index.yaml) with regeneration, validation, and MCP tool integration
**Owner**: Christopher Navta
**Lead Implementor**: Claude
**Architecture**: `planning/sprint-index-architecture.md`

---

## Overview

This sprint implements a centralized sprint index system that provides fast, denormalized access to sprint metadata. The index is a **derived, regenerable cache** sourced from individual sprint manifests.

**Key Principles**:
- Single source of truth: Sprint manifests remain authoritative
- Derived data: Index computed from manifests, never manually edited
- Validation enforced: Schema validated at generation/update
- Regenerable: Can be rebuilt from scratch at any time
- Protocol integration: Updated at specific lifecycle points

---

## Phase Breakdown

### Phase 1: Foundation (P0-CRITICAL)
**Goal**: Create core infrastructure for index management
**Duration**: ~2 hours
**Dependencies**: None

**Tasks**:
1. Define TypeScript types for sprint index (TASK-001)
2. Implement SprintIndexManager module (TASK-002)
3. Write unit tests for SprintIndexManager (TASK-003)

**Deliverables**:
- `src/types/sprint-index.ts` - Type definitions
- `src/common/sprint-index-manager.ts` - Core module
- `src/common/__tests__/sprint-index-manager.test.ts` - Tests
- All tests passing, TypeScript compiles

### Phase 2: Regeneration Tool (P0-CRITICAL)
**Goal**: Enable rebuilding index from existing manifests
**Duration**: ~1.5 hours
**Dependencies**: Phase 1 complete

**Tasks**:
1. Implement regenerate-sprint-index MCP tool (TASK-004)
2. Write integration tests for regeneration (TASK-005)
3. Run initial regeneration on existing 3 sprints (TASK-006)
4. Commit initial sprint-index.yaml (TASK-007)

**Deliverables**:
- `src/tools/regenerate-sprint-index.ts` - Tool implementation
- `src/tools/__tests__/regenerate-sprint-index.test.ts` - Tests
- `planning/sprint-index.yaml` - Initial index file (committed)
- Index validated and matching existing manifests

### Phase 3: Tool Integration (P1-HIGH)
**Goal**: Update existing tools to maintain index
**Duration**: ~2 hours
**Dependencies**: Phase 2 complete

**Tasks**:
1. Update start-sprint tool to add index entries (TASK-008)
2. Update start-sprint tests for index integration (TASK-009)
3. Implement update-sprint-status MCP tool (TASK-010)
4. Write tests for update-sprint-status (TASK-011)

**Deliverables**:
- Enhanced `src/tools/start-sprint.ts` with index updates
- New `src/tools/update-sprint-status.ts` tool
- Integration tests verifying index updates
- All existing tests still passing

### Phase 4: Validation (P1-HIGH)
**Goal**: Ensure index consistency and correctness
**Duration**: ~1.5 hours
**Dependencies**: Phase 3 complete

**Tasks**:
1. Implement validation logic (TASK-012)
2. Write validation tests (TASK-013)
3. Integrate validation into regenerate tool (TASK-014)
4. Add validation to start-sprint and update-status tools (TASK-015)

**Deliverables**:
- `src/common/sprint-index-validator.ts` - Validation module
- `src/common/__tests__/sprint-index-validator.test.ts` - Tests
- Validation integrated into all index-touching tools
- Comprehensive test coverage for edge cases

### Phase 5: Documentation (P2-MEDIUM)
**Goal**: Update protocol and user documentation
**Duration**: ~1 hour
**Dependencies**: Phases 1-4 complete

**Tasks**:
1. Update AGENTS-uncompressed.md with index workflow (TASK-016)
2. Update README.md with index documentation (TASK-017)
3. Create troubleshooting guide (TASK-018)
4. Update sprint-manifest for Sprint 4 completion (TASK-019)

**Deliverables**:
- Updated AGENTS-uncompressed.md (sections 2.2, 2.5, 2.10)
- Updated README.md with index section
- Troubleshooting guide for common index issues
- Complete sprint artifacts

---

## Implementation Strategy

### Development Approach

1. **Test-Driven Development**: Write tests before implementation
2. **Incremental Integration**: Test each component before moving to next
3. **Validation First**: Ensure data integrity at every step
4. **Backward Compatibility**: Existing workflows continue working

### Testing Strategy

**Unit Tests** (target: 80%+ coverage):
- SprintIndexManager: all functions tested
- Validation logic: all rules tested
- Utility functions: edge cases covered

**Integration Tests**:
- Tool end-to-end workflows
- Index updates with real manifests
- Regeneration from multiple sprints

**Manual Validation**:
- Run regenerate on existing 3 sprints
- Verify index matches expected structure
- Test start-sprint creates entry
- Test update-sprint-status modifies entry

### Error Handling

**Non-Fatal Errors**:
- Index update failures during tool calls → log warning, continue
- Index missing → regenerate automatically
- Index corrupted → validate and regenerate

**Fatal Errors**:
- Invalid sprint ID format
- Manifest file doesn't exist when expected
- YAML parse errors in manifests

### Rollback Plan

If issues occur:
1. Revert index-related commits
2. Delete `planning/sprint-index.yaml`
3. Tools fall back to directory scanning
4. No data loss (manifests unchanged)

---

## Task Dependencies

```
Phase 1 (Foundation)
  └─ TASK-001 (Types) ──┐
  └─ TASK-002 (Manager)─┼─> TASK-003 (Tests)
                         │
                         ▼
Phase 2 (Regeneration)
  └─ TASK-004 (Tool) ───┐
  └─ TASK-005 (Tests)───┼─> TASK-006 (Run) ──> TASK-007 (Commit)
                         │
                         ▼
Phase 3 (Integration)
  └─ TASK-008 (Update start-sprint)──> TASK-009 (Tests)
  └─ TASK-010 (New update-status) ───> TASK-011 (Tests)
                                        │
                                        ▼
Phase 4 (Validation)
  └─ TASK-012 (Validator)──> TASK-013 (Tests)
  └─ TASK-014 (Integrate regenerate)
  └─ TASK-015 (Integrate tools)
                                        │
                                        ▼
Phase 5 (Documentation)
  └─ TASK-016 (Protocol docs)
  └─ TASK-017 (README)
  └─ TASK-018 (Troubleshooting)
  └─ TASK-019 (Sprint completion)
```

---

## Acceptance Criteria

### Definition of Done (Phase-Level)

**Phase 1 (Foundation)**:
- [x] TypeScript types defined and exported
- [x] SprintIndexManager module implemented
- [x] Unit tests passing (>80% coverage)
- [x] TypeScript compilation successful

**Phase 2 (Regeneration)**:
- [x] regenerate-sprint-index tool implemented
- [x] Integration tests passing
- [x] Initial index generated from 3 existing sprints
- [x] Index file committed to repository

**Phase 3 (Integration)**:
- [x] start-sprint adds entries to index
- [x] update-sprint-status updates manifest + index atomically
- [x] All existing tests still passing
- [x] New integration tests passing

**Phase 4 (Validation)**:
- [x] Validation detects all inconsistencies
- [x] Tools use validation before saving
- [x] Auto-regeneration on corruption detected
- [x] Edge cases tested and handled

**Phase 5 (Documentation)**:
- [x] Protocol docs updated with index workflow
- [x] README includes index management section
- [x] Troubleshooting guide created
- [x] Sprint artifacts complete

### Sprint-Level Acceptance Criteria

**Functional Requirements**:
- ✅ Index regenerates successfully from existing sprints
- ✅ Index updates automatically on sprint creation
- ✅ Index updates automatically on status changes
- ✅ Validation detects missing/extra sprints
- ✅ All tests passing (unit + integration)

**Performance Requirements**:
- ✅ check-sprint-status execution time < 10ms with index
- ✅ Index file size < 1KB for 3 sprints
- ✅ Index update overhead < 20ms

**Quality Requirements**:
- ✅ Test coverage > 80% for new modules
- ✅ TypeScript compilation with no errors
- ✅ No manual edits required to index file
- ✅ Index recoverable from corruption

**Documentation Requirements**:
- ✅ Architecture document exists (planning/sprint-index-architecture.md)
- ✅ Protocol updated with index workflow
- ✅ README documents index management
- ✅ Code has inline JSDoc comments

---

## Risk Mitigation

### Identified Risks

1. **Index out of sync with manifests**
   - Mitigation: Validation on load, regeneration tool available
   - Probability: Medium | Impact: Medium

2. **Concurrent write corruption**
   - Mitigation: Atomic writes with temp file + rename
   - Probability: Low | Impact: High

3. **Breaking existing tools**
   - Mitigation: Comprehensive integration tests, backward compatibility
   - Probability: Low | Impact: High

4. **Performance regression**
   - Mitigation: Benchmark before/after, lazy loading if needed
   - Probability: Low | Impact: Low

### Contingency Plans

- **If tests fail**: Fix before proceeding to next phase
- **If index corrupts**: Use regeneration tool
- **If tools break**: Revert commits, fix issues, re-test
- **If performance poor**: Profile and optimize, add caching

---

## Progress Tracking

**Phase Status**:
- [ ] Phase 1: Foundation (P0-CRITICAL)
- [ ] Phase 2: Regeneration (P0-CRITICAL)
- [ ] Phase 3: Integration (P1-HIGH)
- [ ] Phase 4: Validation (P1-HIGH)
- [ ] Phase 5: Documentation (P2-MEDIUM)

**Overall Sprint Status**: Planning → In Progress → Validating → Verifying → Complete

---

## Next Steps

1. **Approve execution plan** (get user confirmation)
2. **Begin Phase 1**: Implement TypeScript types and SprintIndexManager
3. **Test Phase 1**: Ensure all unit tests pass
4. **Proceed to Phase 2**: Implement regeneration tool
5. **Continue through phases** until all deliverables complete

---

**Execution Plan Status**: ✅ Complete and ready for implementation
**Next Action**: Await user approval to begin Phase 1
