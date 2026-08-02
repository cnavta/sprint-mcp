# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial npm package preparation
- Comprehensive documentation for npm distribution
- LICENSE file (MIT)
- Package metadata (author, repository, files whitelist)

## [0.1.0] - 2026-08-01

### Added
- Sprint lifecycle management tools (start-sprint, check-sprint-status, update-sprint-status)
- Sprint completion tool with artifact validation
- Sprint cleanup tool for removing completed worktrees
- Sprint index management and regeneration
- Git worktree integration for isolated sprint environments
- Comprehensive test suite (71.57% coverage)
- LLM-powered AGENTS.md compression system
- Sprint Protocol implementation (AGENTS.md, AGENTS-uncompressed.md)
- Documentation and quality improvements
- Config module with 93.33% test coverage
- Integration tests for compression modules

### Changed
- Enhanced sprint index with validation and statistics
- Improved error handling and logging
- Expanded test coverage across modules

### Fixed
- Sprint index corruption recovery via regeneration
- Config module mutation issues in tests
- Atomic sprint status updates

[Unreleased]: https://github.com/cnavta/sprint-mcp/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cnavta/sprint-mcp/releases/tag/v0.1.0
