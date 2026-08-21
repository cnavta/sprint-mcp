# Vibe Mode Examples (Developers)

**Audience**: Developers
**Read time**: ~15 minutes
**Prerequisites**: Understanding of [Vibe Mode Philosophy](../../getting-started/shared/vibe-mode-philosophy.md)
**Related**: [What is Vibe Mode?](what-is-vibe-mode.md) | [Vibe to Production Pipeline](vibe-to-production-pipeline.md)

---

## Overview

These are **real-world vibe sprint examples** showing how developers use vibe mode for exploration. Each example includes:

- The initial vague goal
- Evolution of thinking during exploration
- Pivots and direction changes
- What was tried and discarded
- Final outcome and learnings
- Request log snippets showing the journey

**Key insight**: None of these sprints went as initially imagined. That's the point of vibe mode.

---

## Example 1: WebGL Shader Exploration

### Initial Goal (Vague)

```
Start sprint: Explore Three.js shader capabilities for visual effects
```

**Mindset going in**: "I want to see what's cool with Three.js shaders. Maybe make something for our landing page."

**No idea what the final output would be. Just curiosity.**

---

### Phase 1: Getting Started (Hours 0-2)

**Request log snippet**:
```markdown
## Request 1: Basic shader setup

"Starting with Three.js shader material docs. Creating simple vertex shader
that displaces geometry based on time."

Code:
- Basic scene setup (camera, renderer, mesh)
- Simple vertex shader with sin wave displacement
- Fragment shader with solid color

Result: Working! Mesh waves like a flag. Neat but not interesting yet.

Next: Try adding some color variation
```

**Git commit**: `feat: basic vertex shader with time-based displacement`

**Learning**: Shaders aren't as scary as I thought. GLSL syntax similar to C.

---

### Phase 2: First Pivot - Particle System (Hours 2-4)

**Request log snippet**:
```markdown
## Request 3: Pivot to particle system

"Flag waving is cool but limited. Saw an example of shader-based particles.
That seems more interesting for generative art."

Approach:
- Created BufferGeometry with 10,000 particles
- Vertex shader positions particles in 3D space
- Fragment shader colors based on position

Problem: Particles are static. Need movement.

Attempt 1: Update positions in JavaScript each frame
Result: 30fps. Too slow. Moving 10k particles via CPU is bottleneck.

Attempt 2: Calculate movement in vertex shader using time uniform
Result: 60fps! GPU handles all the math. Much better.

Learning: Move computation to GPU whenever possible.
```

**Git commit**: `feat: GPU-based particle system with 10k particles`

**Discovery moment**: "Oh, this is how generative art works—lots of particles with GPU-computed movement!"

---

### Phase 3: Experimentation - Noise Functions (Hours 4-7)

**Request log snippet**:
```markdown
## Request 5: Add Perlin noise for organic movement

"Sine waves look too regular. Want more organic, flowing movement.
Found GLSL noise function library (glsl-noise)."

Experiment 1: 2D Perlin noise
- Used noise(position.xy + time) for displacement
- Result: Particles flow like smoke! Beautiful.

Experiment 2: 3D Perlin noise
- Used noise(position + time) for displacement
- Result: More complex movement, particles swirl

Experiment 3: Fractional Brownian Motion (layered noise)
- Combined multiple octaves of noise
- Result: Extremely organic, almost liquid-like

Performance:
- 2D noise: 60fps
- 3D noise: 60fps
- FBM (3 octaves): 45fps
- FBM (5 octaves): 30fps

Decision: 3D noise hits the sweet spot (beautiful + performant)
```

**Git commits**:
- `experiment: 2D perlin noise displacement`
- `experiment: 3D perlin noise displacement`
- `experiment: FBM noise (3 octaves)` ← chosen approach

**What I tried and discarded**:
- ❌ Sine waves (too regular)
- ❌ Random noise (too chaotic, no flow)
- ❌ 5-octave FBM (too slow)

---

### Phase 4: Polish - Color & Interaction (Hours 7-10)

**Request log snippet**:
```markdown
## Request 8: Make it interactive

"Static generative art is cool, but interaction would be cooler.
What if mouse position influenced the particles?"

Attempt 1: Mouse controls noise offset
- Pass mouse coords as uniform
- Offset noise lookup by mouse position
- Result: Particles follow cursor! But too directly.

Attempt 2: Mouse creates attraction point
- Calculate distance from particle to mouse
- Apply force towards mouse (inverse square law)
- Result: Particles gently flow towards cursor. Much better.

## Request 9: Add color based on movement

"Monochrome particles work, but color could enhance it."

Tried:
1. Color by position - boring
2. Color by velocity - interesting!
3. Color by noise value - creates flowing gradients

Chosen: Velocity-based coloring
- Blue = slow movement
- Green = medium
- Yellow/Red = fast movement

Effect: You can SEE the flow patterns. Visual + beautiful.
```

**Git commit**: `feat: mouse interaction + velocity-based coloring`

**Polish**:
- Added mouse smoothing (lerp) for organic response
- Optimized shader (removed unused calculations)
- Added dat.GUI controls for tweaking parameters

---

### Final Outcome

**What I built**:
- Interactive generative art particle system
- 10,000 particles moving via 3D Perlin noise
- Mouse interaction (particles flow toward cursor)
- Velocity-based color gradient
- 60fps on modern hardware
- ~200 lines of code (very compact!)

**Request log value**:
- Documents 4 distinct phases of exploration
- Shows 7+ experiments (some failed, some succeeded)
- Performance benchmarks for each approach
- Decision rationale captured

**Production potential**:
Could become:
- Landing page background (high visual impact)
- Creative tool (let users tweak parameters)
- WebGL learning resource (well-documented exploration)

---

### Key Learnings

1. **GPU > CPU for particle math** - Moving 10k particles in shader = 60fps. In JavaScript = 30fps.
2. **Perlin noise creates organic movement** - Better than sine waves or random noise.
3. **Fractional Brownian Motion** - Layering noise creates complexity, but has performance cost.
4. **Velocity-based color** - Makes invisible forces visible.
5. **Mouse interaction** - Attraction (not direct control) feels more natural.

**Time "wasted" on dead ends**: ~3 hours (trying approaches that didn't work)
**Value of those dead ends**: Learned constraints, built intuition about what works

**Vibe sprint success**: ✅ Built something cool, learned WebGL deeply, have foundation for production work

---

## Example 2: API Rate Limiting Strategy Exploration

### Initial Goal (Vague)

```
Start sprint: Figure out the best rate limiting approach for our API
```

**Context**: Building API for SaaS product. Need rate limiting to prevent abuse. Not sure which strategy is best.

**Constraint**: Need to support 50k requests/second at scale.

---

### Phase 1: Research & Baseline (Hours 0-1)

**Request log snippet**:
```markdown
## Request 1: Understand rate limiting strategies

Research:
- Token bucket (refill at constant rate)
- Leaky bucket (process at constant rate)
- Fixed window (reset counter each time period)
- Sliding window (rolling time window)

Theory:
- Token bucket = best for burst handling
- Sliding window = most accurate

Decision: Start with token bucket (most common approach)

## Request 2: Naive in-memory implementation

Goal: Establish baseline performance

Implementation:
- Map<userId, { tokens, lastRefill }>
- Check tokens on each request
- Refill based on time elapsed

Benchmark:
- 50k req/s single user: ✅ works
- 50k req/s across 1k users: ✅ works
- Memory usage: ~50MB for 1M users

Problem: Loses all data on server restart. Not acceptable.
```

**Git commit**: `experiment: in-memory token bucket baseline`

**Result**: In-memory works but won't scale in production (no persistence).

---

### Phase 2: Redis Attempt (Hours 1-4)

**Request log snippet**:
```markdown
## Request 3: Redis-backed rate limiting

Rationale: Redis for persistence + speed

Implementation:
- Store tokens in Redis hash per user
- Use EVAL (Lua script) for atomic token check + refill
- TTL on keys (expire unused rate limit data)

Benchmark 1: Local Redis
- 50k req/s single user: 45k req/s ❌ (Redis bottleneck)
- Latency: +2ms per request

Benchmark 2: Redis cluster (3 nodes)
- 50k req/s distributed: ~120k req/s ✅
- But: Added infrastructure complexity

Benchmark 3: Redis pipeline (batching)
- 50k req/s with 100-req batches: ~80k req/s
- Latency: Better, but batching adds 10-50ms delay

Analysis:
✅ Pro: Persistence, scales horizontally
❌ Con: Network latency, infrastructure cost, ops complexity

## Request 5: Attempt Redis + local cache

"What if we cache in-memory with Redis as backup?"

Approach:
- In-memory cache for hot keys (LRU, 10k limit)
- Redis for cold keys + persistence
- Sync to Redis every 10s

Result:
- Hot path (cached): 50k req/s ✅
- Cold path (Redis): 45k req/s ✅
- Memory: ~20MB + Redis storage

Problem: 10s sync window = data loss risk on crash
Problem: Cache invalidation complexity across multiple servers
```

**Git commits**:
- `experiment: redis token bucket`
- `experiment: redis cluster approach`
- `experiment: redis + in-memory cache`

**Learning**: Redis adds persistence but hurts performance. Hybrid is complex.

---

### Phase 3: Alternative - Database-Backed (Hours 4-5)

**Request log snippet**:
```markdown
## Request 7: PostgreSQL rate limiting (curiosity)

"Wonders if database could work..."

Implementation:
- Postgres table: user_id, tokens, last_refill
- UPDATE with token logic in SQL
- Index on user_id

Benchmark:
- 50k req/s: ~5k req/s ❌ (database is bottleneck)
- Latency: +20ms per request

Analysis:
- Way too slow for our needs
- Persistent, but performance unacceptable

Learning: Databases aren't for high-frequency reads/writes

Verdict: ❌ Ruled out immediately
```

**Git commit**: `experiment: postgres rate limiting (too slow)`

**What I discarded**: Database approach (evidence: 10x too slow)

---

### Phase 4: Breakthrough - Hybrid Approach (Hours 5-8)

**Request log snippet**:
```markdown
## Request 9: Rethinking the problem

Current state:
- In-memory: Fast but no persistence
- Redis: Persistent but slower
- Database: Persistent but way too slow

Question: "Do we NEED persistence for ALL rate limit data?"

Insight: Rate limits reset hourly. If server crashes, worst case
is users get reset counters. Not catastrophic.

But: We DO need persistence for:
- Ban lists (users who exceeded limits multiple times)
- Analytics (who's hitting limits, how often)

New approach - Hybrid with different goals:
- In-memory for rate limit enforcement (speed)
- Redis/DB for ban lists (persistence)
- Async logging for analytics (no blocking)

## Request 10: Implement refined hybrid

Implementation:
- In-memory token bucket (primary enforcement)
- Violation counter (3 strikes within 1 hour = temp ban)
- Banned users in Redis (persistent, checked before rate limit)
- Async log stream to database (analytics only)

Benchmark:
- Normal requests: 100k req/s ✅ (pure in-memory)
- Banned user check: 80k req/s ✅ (Redis cache of ban list)
- Violation logging: Async, no blocking

Failure scenario:
- Server restart: Active rate limits reset (acceptable)
- Banned users: Persist across restarts (critical)

Performance: ✅ Exceeds requirements (100k req/s vs 50k target)
Persistence: ✅ Where it matters (ban lists, analytics)
Ops complexity: ✅ Low (in-memory + small Redis ban list)
```

**Git commit**: `feat: hybrid in-memory + redis ban list approach`

**Discovery**: Not all data needs same persistence guarantees.

---

### Final Outcome

**Chosen approach**: Hybrid in-memory + Redis ban list

**Decision rationale**:
| Approach | Performance | Persistence | Ops Complexity | Verdict |
|----------|-------------|-------------|----------------|---------|
| Pure in-memory | 100k req/s ✅ | None ❌ | Low ✅ | Almost |
| Redis | 45k req/s ❌ | Full ✅ | Medium ❌ | Too slow |
| Database | 5k req/s ❌ | Full ✅ | Low ✅ | Way too slow |
| Hybrid | 100k req/s ✅ | Critical only ✅ | Low ✅ | **Winner** |

**What I built**:
- Production-ready rate limiter prototype
- Benchmark suite comparing all approaches
- Documentation of trade-offs
- Request log explaining decision process

**Artifacts for production sprint**:
1. Working code (can be polished)
2. Performance data (100k req/s proven)
3. Trade-off analysis (why hybrid wins)
4. Edge case handling (ban lists, analytics)

---

### Key Learnings

1. **Question assumptions** - "Need persistence" → "Need persistence for WHAT?"
2. **Benchmark everything** - Intuition is often wrong (Redis not always faster)
3. **Different data, different storage** - Rate limits (in-memory) vs bans (Redis) have different needs
4. **Explore dead ends** - Database attempt took 1 hour, proved it won't work (valuable)
5. **Hybrid solutions** - Often better than "pure" approaches

**Time spent on approaches**:
- In-memory baseline: 1h
- Redis variations: 3h
- Database (dead end): 1h
- Hybrid approach: 3h

**Total**: 8 hours
**Value**: Chose optimal approach with evidence, not assumption

**Vibe sprint success**: ✅ Answered "what's the best strategy?" with data

---

## Example 3: Collaborative Editing Prototyping

### Initial Goal (Vague)

```
Start sprint: Explore real-time collaborative editing approaches
```

**Context**: Building docs product. Want Google Docs-style collaboration. Not sure how to implement.

**Knowledge gap**: Never built real-time collab before. Need to learn.

---

### Phase 1: Understanding the Problem (Hours 0-2)

**Request log snippet**:
```markdown
## Request 1: Research collaborative editing

Research:
- Operational Transform (OT) - Google Docs approach
- Conflict-free Replicated Data Types (CRDTs) - Figma approach
- Last-write-wins (LWW) - Simple but lossy

Complexity:
- OT: Complex but proven
- CRDTs: Complex but mathematically sound
- LWW: Simple but users lose data (unacceptable)

Decision: Explore both OT and CRDTs, see which feels achievable

## Request 2: Transport layer - WebSockets vs WebRTC

Before implementing merge logic, need transport.

WebSockets:
- Server-mediated (client → server → clients)
- Reliable (TCP)
- Easy to deploy

WebRTC:
- Peer-to-peer (client ↔ client)
- Lower latency (no server hop)
- Complex setup (STUN/TURN servers)

Initial thought: "WebRTC sounds cool, P2P is appealing"

Prototype WebRTC connection setup...
```

**Git commit**: `experiment: webrtc peer connection setup`

---

### Phase 2: WebRTC Reality Check (Hours 2-4)

**Request log snippet**:
```markdown
## Request 4: WebRTC complexity assessment

Implementation attempt:
- Signaling server for peer discovery (needed server anyway!)
- STUN server for NAT traversal
- TURN server for firewall cases (relay traffic)
- ICE candidate exchange (complex)

Benchmark:
- Latency: ~10ms vs WebSockets ~20ms (2x better)
- Setup complexity: 10x WebSockets
- Operational complexity: Need STUN/TURN infrastructure

Problems:
1. Corporate firewalls block P2P (fallback to TURN = server relay anyway)
2. Many peers (>5 users) = N² connections (scalability issue)
3. User joins/leaves = complex connection renegotiation

Analysis:
- Latency benefit: 10ms savings
- Complexity cost: Massive

Decision: ❌ WebRTC is overkill for our use case
Learning: "Cool technology" ≠ "right technology"

Pivot: Use WebSockets, focus complexity on merge logic instead
```

**Git commit**: `experiment: webrtc (too complex, abandoned)`

**Dead end documented**: 4 hours exploring WebRTC, learned it's wrong fit.

---

### Phase 3: Operational Transform Attempt (Hours 4-8)

**Request log snippet**:
```markdown
## Request 6: Implement basic OT

Approach: Operational Transform for text merging

Simple case:
- User A types "H" at position 0
- User B types "!" at position 0 (simultaneous)
- Transform operations so both apply correctly

Implementation:
- Operation: { type: 'insert', position: 0, char: 'H' }
- Transform function: Adjust position based on concurrent ops

Benchmark:
- 2 users: ✅ Works!
- 3 users: ✅ Works!
- Concurrent edits in same position: ✅ Merges correctly!

Problems emerged:
1. Delete operations more complex than insert
2. Block operations (paste, cut) significantly harder
3. Undo/redo requires operation history (memory grows)
4. Server must maintain total operation order (bottleneck)

## Request 8: Implement delete transformation

"Trying to handle delete operations correctly..."

Attempt 1: Simple position tracking
- Bug: Concurrent deletes create inconsistent state
- Issue: "Delete at 5" - but what if position 4 was deleted?

Attempt 2: Operation IDs and dependency tracking
- Works but: Complex dependency tree
- Edge case: Deleting already-deleted text

After 3 hours on delete operations:
- Working, but code is getting very complex
- Fragile (many edge cases)
- Hard to reason about correctness

Concern: If delete is this hard, undo/redo will be nightmare
```

**Git commits**:
- `experiment: basic OT insert`
- `experiment: OT delete (complex)`
- `experiment: OT dependency tracking`

**Learning**: OT works but complexity is high. Is there a simpler way?

---

### Phase 4: CRDT Exploration (Hours 8-12)

**Request log snippet**:
```markdown
## Request 10: Research CRDTs as alternative

"OT is complex. CRDTs are supposedly mathematically guaranteed to merge correctly."

Research:
- Yjs (mature CRDT library for JS)
- Automerge (another CRDT implementation)
- RGAs (Replicated Growable Array - text CRDT)

## Request 11: Prototype with Yjs

Implementation:
- Install yjs + y-websocket
- Create Y.Text document
- Bind to textarea
- Set up WebSocket provider

Result: Working collaborative editing in ~50 lines of code!

Benchmark:
- 2 users: ✅ Perfect sync
- 5 users: ✅ Perfect sync
- Concurrent edits: ✅ Merges correctly (no conflicts!)
- Delete operations: ✅ Just works
- Undo/redo: ✅ Built-in

Comparison:
| Feature | OT (custom) | CRDT (Yjs) |
|---------|-------------|------------|
| Insert | 50 lines | 5 lines |
| Delete | 150 lines (buggy) | Built-in |
| Undo/redo | Not implemented | Built-in |
| Offline sync | Not implemented | Built-in |
| Rich text | Would be nightmare | Supported |

Revelation: "I was reinventing the wheel. Badly."

## Request 12: Test Yjs edge cases

Testing:
1. Offline editing → reconnect → sync: ✅ Works perfectly
2. Rapid concurrent typing: ✅ No conflicts
3. Network partition → resolve: ✅ Eventual consistency
4. 10 users simultaneously: ✅ Performs well

Performance:
- Message size: ~20 bytes per insert (efficient)
- Memory: ~1MB for 10k operations (reasonable)
- Latency: Same as WebSocket (~20ms)

Only caveat:
- Learning curve (CRDT concepts unfamiliar)
- Bundle size (+50KB, but worth it)

Decision: ✅ Use Yjs (CRDT) instead of custom OT
```

**Git commit**: `feat: yjs crdt implementation (chosen approach)`

**Breakthrough**: Library does the hard work, we focus on UX.

---

### Final Outcome

**Journey summary**:
- Hours 0-2: Research (OT vs CRDT, WebSockets vs WebRTC)
- Hours 2-4: WebRTC experiment (abandoned as too complex)
- Hours 4-8: Custom OT implementation (working but fragile)
- Hours 8-12: Yjs CRDT exploration (clear winner)

**What I discarded**:
- ❌ WebRTC (cool but overkill)
- ❌ Custom OT (works but complex and incomplete)
- ❌ Last-write-wins (too lossy)

**What I chose**:
- ✅ WebSockets (transport layer)
- ✅ Yjs/CRDTs (conflict resolution)

**Why Yjs won**:
1. **Proven** - Used by major products (Figma, Linear)
2. **Complete** - Handles edge cases I didn't even know existed
3. **Performant** - Efficient wire format, low memory
4. **Rich features** - Undo/redo, offline sync, rich text support
5. **Focus shift** - Spend time on UX, not merge algorithms

**Artifacts for production sprint**:
- Working prototype (10 concurrent users tested)
- Performance benchmarks
- Trade-off analysis (why CRDT > custom OT)
- Request log documenting decision journey

**Time "wasted"**:
- WebRTC: 4 hours (learned it's wrong fit)
- Custom OT: 4 hours (learned it's too complex)

**Value of "waste"**:
- Tried the obvious approaches
- Understood why they don't work for our needs
- Have evidence for architectural decisions
- Can explain to team why we chose Yjs

---

### Key Learnings

1. **Don't reinvent solved problems** - Yjs exists, is better than anything I'd build
2. **"Cool technology" ≠ "right technology"** - WebRTC is cool, but wrong for this use case
3. **Explore dead ends to gain confidence** - Trying custom OT proved Yjs was right choice
4. **Libraries are force multipliers** - 50 lines with Yjs vs 200+ lines of buggy custom code
5. **Perfect is the enemy of good** - Custom OT could work eventually, but Yjs works now

**Vibe sprint success**: ✅ Found production-ready approach by exploring alternatives

---

## Common Patterns Across Examples

### Pattern 1: Initial Goal Was Wrong

- **Example 1**: "Try shaders" → became generative art particle system
- **Example 2**: "Add rate limiting" → became hybrid architecture discussion
- **Example 3**: "Try WebRTC" → became CRDT implementation

**Lesson**: Vibe mode expects goals to evolve.

### Pattern 2: Dead Ends Provided Value

- **Example 1**: Sine waves, random noise, 5-octave FBM = eliminated
- **Example 2**: Pure Redis, pure database = eliminated
- **Example 3**: WebRTC, custom OT = eliminated

**Lesson**: Knowing what DOESN'T work is valuable.

### Pattern 3: Breakthroughs Came from Questioning Assumptions

- **Example 1**: "Particles need CPU movement" → "No, use GPU shaders"
- **Example 2**: "Need persistence for all data" → "No, just critical data"
- **Example 3**: "Need to build merge logic" → "No, use proven library"

**Lesson**: Vibe mode creates space to question and experiment.

### Pattern 4: Request Log = Learning Artifact

All three examples have detailed request logs documenting:
- What was tried and why
- Performance data
- Decision rationale
- Evolution of thinking

**Lesson**: The log is as valuable as the code.

---

## Next Steps

**Apply these patterns**:
- [Vibe to Production Pipeline](vibe-to-production-pipeline.md) - Turn exploration into production
- [First Vibe Sprint Tutorial](../../getting-started/developers/04-first-sprint-vibe.md) *(Coming Soon)*

**See more examples**:
- [Non-Coding Vibe Examples](vibe-examples-noncoding.md) *(Coming Soon)* - For creators and hobbyists

---

## Summary

**Vibe mode** enables structured exploration that:
- Starts with vague goals
- Embraces pivots and dead ends
- Documents the journey
- Produces working prototypes
- Informs production decisions

These examples show that **exploration isn't wasted time—it's how you find the right approach**.

---

**Document Version**: 1.0
**Last Updated**: 2026-08-13
**Part of**: Sprint 24 (P1-T04) - Vibe Mode Documentation Foundation
**Examples**: Real vibe sprint patterns from production use
