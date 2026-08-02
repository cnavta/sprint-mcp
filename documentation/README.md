# Documentation Index

**Last Updated**: 2026-08-01

This directory contains architecture and operational documentation for sprint-mcp.

---

## NPM Distribution Documentation

### Core Guides

1. **[NPM Distribution Guide](./npm-distribution-guide.md)** - Comprehensive overview
   - Current state analysis
   - Distribution strategy (global, npx, project-local)
   - Package configuration (package.json, tsconfig.json)
   - Build process and verification
   - Architectural decisions and rationale
   - **Read this first** for overall understanding

2. **[NPM Publish Checklist](./npm-publish-checklist.md)** - Step-by-step publishing guide
   - Pre-publish preparation (one-time setup)
   - Pre-publish verification (every release)
   - Publishing process
   - Post-publish verification
   - Rollback procedures
   - **Use this** when actually publishing to npm

3. **[Claude Desktop Installation Guide](./claude-desktop-installation-guide.md)** - End-user installation
   - Installation methods (global, npx, project-local)
   - Claude Desktop configuration
   - Troubleshooting
   - Environment variables
   - **For end users** installing sprint-mcp

### Supporting Documents

4. **[.npmignore Template](./npmignore-template.md)** - File exclusion configuration
   - Complete .npmignore template
   - Verification commands
   - Comparison with `files` field approach
   - **Reference** when configuring package exclusions

5. **[NPM README Template](./npm-readme-template.md)** - Package README
   - Installation instructions
   - Configuration examples
   - Available tools reference
   - **Template** for npm package README

---

## Document Hierarchy

```
documentation/
├── README.md (this file)                          # Documentation index
├── npm-distribution-guide.md                      # Architecture overview
├── npm-publish-checklist.md                       # Publishing workflow
├── claude-desktop-installation-guide.md           # End-user installation
├── npmignore-template.md                          # Package exclusions
└── npm-readme-template.md                         # Package README
```

---

## Quick Links

### For Developers (Publishing)

- **First time publishing?** → [NPM Distribution Guide](./npm-distribution-guide.md)
- **Ready to publish?** → [NPM Publish Checklist](./npm-publish-checklist.md)
- **Need .npmignore?** → [.npmignore Template](./npmignore-template.md)

### For End Users (Installing)

- **Installing sprint-mcp?** → [Claude Desktop Installation Guide](./claude-desktop-installation-guide.md)

### For Contributors

- **Understanding npm strategy** → [NPM Distribution Guide - Architectural Decisions](./npm-distribution-guide.md#architectural-decisions)
- **Creating package README** → [NPM README Template](./npm-readme-template.md)

---

## Key Architectural Decisions

From [npm-distribution-guide.md](./npm-distribution-guide.md):

1. **Package Name**: `sprint-mcp` (root namespace) - simple, memorable
2. **Distribution Strategy**: Support both global and npx installation
3. **File Inclusion**: Use `files` field in package.json (whitelist approach)
4. **Documentation**: Include AGENTS.md (compressed), exclude AGENTS-uncompressed.md
5. **Version Management**: Use `brat release` tool (syncs architecture.yaml ↔ package.json)
6. **Entry Point**: Binary with shebang for global/npx usage

---

## Status

### ✅ Documented

- NPM distribution architecture
- Publishing workflow and checklist
- End-user installation procedures
- Package configuration requirements
- Architectural decision rationale

### ⏳ Pending Implementation

Before first npm publish:
- [ ] Add LICENSE file (MIT recommended)
- [ ] Update package.json with distribution fields
- [ ] Create comprehensive package README.md
- [ ] Test `npm pack` and verify contents
- [ ] Decide on package namespace (sprint-mcp vs @org/sprint-mcp)

See [NPM Publish Checklist](./npm-publish-checklist.md) for complete preparation steps.

---

## Maintenance

### When to Update

- **Before each npm publish**: Review checklist for any new steps
- **After architectural changes**: Update distribution guide
- **When installation issues reported**: Update troubleshooting sections
- **When new features added**: Update tool reference in installation guide

### Document Owners

- **NPM Distribution Guide**: Lead Architect
- **NPM Publish Checklist**: Lead Implementor
- **Installation Guide**: Quality Lead / Documentation

---

## Additional Resources

### External References

- [npm Documentation](https://docs.npmjs.com/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Project Documentation

- **Sprint Protocol**: `../AGENTS.md` (compressed version)
- **Development Guide**: `../CLAUDE.md` (repo instructions)
- **Architecture**: `../architecture.yaml` (system design)
- **Examples**: `../examples/` (usage examples)

---

**Document Version**: 1.0
**Last Reviewed**: 2026-08-01
**Next Review**: Before first npm publish
