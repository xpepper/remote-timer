# Implementation Plan: User Story #4 - Shared Timer State

## User Story
**As a** remote team member, **I want** to see the same timer state as my teammates in real-time, **so that** we can stay synchronized during focus sessions.

## Acceptance Criteria
- All team members see the same timer value
- Changes made by one member are reflected for all members
- Timer state updates are near real-time (within 1 second)

---

## Current Architecture Analysis

### Current State
- **Frontend Only**: Pure client-side application running in browser
- **Local State**: Timer state exists only in the user's browser
- **No Backend**: No server to coordinate state between clients
- **Technology**: TypeScript + HTMX + Vite
- **Testing**: Vitest for unit tests

### Current Components
1. `src/timer.ts` - Timer class with local state management
2. `index.html` - UI and event handlers
3. `src/timer.test.ts` - Unit tests

---

## Architectural Challenges

### Major Changes Required
1. **Backend Infrastructure**: Need a server to maintain shared state
2. **Real-time Communication**: Bidirectional client-server communication
3. **State Synchronization**: Handle concurrent operations from multiple clients
4. **Session Management**: Group users into shared timer sessions
5. **Conflict Resolution**: Determine authority when multiple users act simultaneously

### Technical Decisions Needed
1. Backend technology (Node.js, Python, Go, etc.)
2. Real-time communication protocol (WebSockets, SSE, long-polling)
3. State storage (in-memory, Redis, database)
4. Deployment strategy (single server, cloud, serverless)

---

## Technology Options

### Option 1: WebSockets with Node.js Backend (RECOMMENDED)
**Pros:**
- Bidirectional real-time communication
- Efficient for frequent updates
- Node.js integrates well with existing TypeScript codebase
- Mature ecosystem (Socket.io, ws library)
- Can share TypeScript types between frontend and backend

**Cons:**
- Requires running backend server
- More complex deployment
- Need to handle WebSocket connection management

**Implementation:**
- Backend: Node.js + Express + Socket.io
- Frontend: Socket.io client library
- State: In-memory storage (or Redis for scalability)

### Option 2: Server-Sent Events (SSE) with REST API
**Pros:**
- Simpler than WebSockets
- Works with existing HTTP infrastructure
- Good browser support
- Clients receive real-time updates

**Cons:**
- Unidirectional (server to client only)
- Need separate REST API for client actions
- Less efficient for high-frequency updates
- Connection limits in some browsers

**Implementation:**
- Backend: Node.js + Express
- Frontend: EventSource API + fetch for actions
- State: In-memory storage

### Option 3: Firebase Realtime Database (Managed Service)
**Pros:**
- No backend code required
- Built-in real-time synchronization
- Free tier available
- Handles scaling automatically
- Simple SDK

**Cons:**
- Vendor lock-in
- Less control over business logic
- Pricing can scale unexpectedly
- Limited customization

**Implementation:**
- Frontend: Firebase SDK
- Backend: Firebase Realtime Database
- State: Managed by Firebase

### Option 4: Simple HTTP Polling
**Pros:**
- Simplest to implement
- Works with any HTTP server
- No persistent connections

**Cons:**
- NOT real-time (delays of 1+ seconds)
- Inefficient (constant polling)
- Higher server load
- Poor user experience
- Does NOT meet "near real-time" acceptance criteria

**NOT RECOMMENDED** - Does not meet acceptance criteria

---

## Recommended Approach: WebSockets with Node.js

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌─────────────┐    ┌────────────┐     │
│  │  index.html  │───▶│  Timer UI   │───▶│ Socket.io  │     │
│  │              │    │  Component  │    │   Client   │     │
│  └──────────────┘    └─────────────┘    └──────┬─────┘     │
│                                                  │           │
└──────────────────────────────────────────────────┼───────────┘
                                                   │
                                        WebSocket Connection
                                                   │
┌──────────────────────────────────────────────────┼───────────┐
│                                                  │           │
│  ┌───────────────────────────────────────────────▼────────┐ │
│  │              Socket.io Server                          │ │
│  └───────────────────────────────────────────────┬────────┘ │
│                                                  │           │
│  ┌───────────────────────────────────────────────▼────────┐ │
│  │           Session Manager                              │ │
│  │  - Manages timer sessions                              │ │
│  │  - Routes events to correct session                    │ │
│  └───────────────────────────────────────────────┬────────┘ │
│                                                  │           │
│  ┌───────────────────────────────────────────────▼────────┐ │
│  │           Shared Timer State                           │ │
│  │  {                                                      │ │
│  │    sessionId: "abc123",                                │ │
│  │    duration: 1500,                                     │ │
│  │    remainingTime: 1200,                                │ │
│  │    isRunning: true,                                    │ │
│  │    isPaused: false,                                    │ │
│  │    clients: ["user1", "user2", ...]                    │ │
│  │  }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│                   Backend (Node.js Server)                   │
└───────────────────────────────────────────────────────────────┘
```

### State Flow

1. **User Action** (e.g., clicks Start button)
   - Frontend emits event to server: `timer:start`
   
2. **Server Processing**
   - Receives event from client
   - Updates shared state
   - Broadcasts update to ALL clients in session
   
3. **All Clients Receive Update**
   - Update local UI to reflect new state
   - No local timer logic - server is source of truth

4. **Timer Tick**
   - Server maintains interval
   - Broadcasts remaining time every second
   - Clients update display

---

## Implementation Phases

### Phase 1: Backend Infrastructure (Week 1)
**Goal**: Set up basic WebSocket server with state management

**Tasks:**
1. Create `server/` directory structure
2. Initialize Node.js backend project
3. Install dependencies: express, socket.io, typescript
4. Set up TypeScript configuration for backend
5. Create basic Express + Socket.io server
6. Implement session management (in-memory Map)
7. Create shared types file (`types/timer.ts`)
8. Write backend unit tests for session management

**Files to Create:**
- `server/package.json`
- `server/tsconfig.json`
- `server/src/index.ts` - Main server file
- `server/src/session-manager.ts` - Session state management
- `server/src/timer-service.ts` - Server-side timer logic
- `types/timer.ts` - Shared TypeScript types
- `server/src/session-manager.test.ts` - Tests

**Deliverables:**
- Running WebSocket server on localhost:3000
- Session creation and joining
- Basic state broadcast

### Phase 2: Frontend Integration (Week 1-2)
**Goal**: Connect frontend to backend and replace local state

**Tasks:**
1. Install socket.io-client in frontend
2. Create `src/socket-service.ts` - WebSocket client wrapper
3. Refactor `src/timer.ts` to become state interface (no logic)
4. Update `index.html` to use socket events
5. Implement session joining UI
6. Handle connection/disconnection states
7. Update frontend tests (may need to mock socket)

**Files to Modify:**
- `package.json` - Add socket.io-client
- `src/timer.ts` - Refactor to event-based interface
- `index.html` - Update to use socket events
- Create `src/socket-service.ts`
- Update `src/timer.test.ts`

**Deliverables:**
- Frontend connects to backend
- Timer actions go through WebSocket
- UI updates from server broadcasts

### Phase 3: Synchronization & Testing (Week 2)
**Goal**: Ensure all clients stay synchronized

**Tasks:**
1. Test with multiple browser tabs/windows
2. Handle edge cases (disconnection, reconnection)
3. Implement optimistic UI updates for responsiveness
4. Add loading/connecting states
5. Test timer accuracy across clients
6. Load testing (simulate multiple users)
7. Integration tests

**Testing Scenarios:**
- Multiple clients in same session
- Client joins mid-countdown
- Client disconnects and reconnects
- Network latency simulation
- Concurrent actions (two users click at same time)

**Deliverables:**
- Stable multi-client synchronization
- Comprehensive test suite
- Performance benchmarks

### Phase 4: Session Management UI (Week 2-3)
**Goal**: Allow users to create/join sessions

**Tasks:**
1. Add session creation UI
2. Generate/display session IDs or URLs
3. Allow joining by session ID
4. Show list of connected users
5. Handle session lifecycle (create, destroy when empty)
6. Persist session ID in URL or localStorage

**Files to Modify:**
- `index.html` - Add session management UI
- `server/src/session-manager.ts` - Session lifecycle

**Deliverables:**
- Users can create new sessions
- Users can join existing sessions
- Session ID visible and shareable

### Phase 5: Deployment & Documentation (Week 3)
**Goal**: Deploy to production and document usage

**Tasks:**
1. Choose deployment platform (Heroku, Railway, Render, etc.)
2. Configure production build scripts
3. Set up environment variables
4. Deploy backend server
5. Deploy frontend (Netlify, Vercel, or same server)
6. Configure CORS and security
7. Update README with deployment info
8. Create user documentation

**Deliverables:**
- Live production URL
- Deployment documentation
- User guide

---

## Data Model

### Shared Timer State
```typescript
interface TimerState {
  sessionId: string;
  duration: number;          // Initial duration in seconds
  remainingTime: number;     // Current remaining time in seconds
  isRunning: boolean;
  isPaused: boolean;
  startedAt?: number;        // Timestamp when started
  pausedAt?: number;         // Timestamp when paused
}
```

### Session
```typescript
interface Session {
  id: string;
  state: TimerState;
  clients: Map<string, ClientInfo>;
  createdAt: number;
  lastActivity: number;
}

interface ClientInfo {
  id: string;
  connectedAt: number;
  // Future: username, avatar, etc.
}
```

### WebSocket Events

**Client → Server:**
- `timer:start` - Start timer with duration
- `timer:pause` - Pause timer
- `timer:resume` - Resume timer
- `timer:reset` - Reset timer
- `session:join` - Join a session
- `session:create` - Create new session

**Server → Client:**
- `timer:state` - Full state update
- `timer:tick` - Remaining time update
- `session:joined` - Confirmation of joining
- `session:user-joined` - Another user joined
- `session:user-left` - User disconnected
- `error` - Error message

---

## Migration Strategy

### Backward Compatibility
To avoid breaking current functionality during development:

1. **Keep existing code working**
   - Don't delete current `src/timer.ts` immediately
   - Create new files alongside existing ones
   - Use feature flags or separate routes

2. **Gradual migration**
   - Phase 1: Backend works standalone
   - Phase 2: Frontend can use either local or remote
   - Phase 3: Switch default to remote
   - Phase 4: Remove local timer code

3. **Testing**
   - Maintain all existing tests
   - Add new integration tests
   - Test both modes during transition

---

## Risks & Mitigation

### Risk 1: WebSocket Connection Reliability
**Mitigation:**
- Implement automatic reconnection
- Show connection status in UI
- Fallback to local mode on connection failure
- Use heartbeat/ping-pong to detect dead connections

### Risk 2: State Synchronization Issues
**Mitigation:**
- Server is single source of truth
- Clients are "dumb" - just display state
- Use timestamp-based conflict resolution
- Thorough testing with multiple clients

### Risk 3: Deployment Complexity
**Mitigation:**
- Start with simple deployment (single server)
- Use platform-as-a-service (Railway, Render)
- Document deployment process
- Consider Docker for consistency

### Risk 4: Cost of Hosting
**Mitigation:**
- Use free tiers initially (Railway, Render, Fly.io)
- Optimize for efficiency (close idle sessions)
- Monitor usage
- Consider serverless for scaling

### Risk 5: Timer Accuracy
**Mitigation:**
- Use server-side intervals (not client-side)
- Send timestamps, not just remaining time
- Clients can interpolate between updates
- Test timer drift over long periods

---

## Open Questions

1. **Session Lifecycle**: How long should empty sessions persist?
   - Recommendation: Delete after 5 minutes of inactivity

2. **Access Control**: Should sessions be private/password-protected?
   - Recommendation: Start with open sessions, add later

3. **User Identity**: Do we need user accounts/names?
   - Recommendation: Start anonymous, show "User 1", "User 2"

4. **Session Limits**: Max users per session? Max concurrent sessions?
   - Recommendation: Start with no limits, monitor in production

5. **Persistence**: Should sessions persist across server restarts?
   - Recommendation: Start with in-memory, add Redis later if needed

---

## Success Metrics

### Technical Metrics
- WebSocket connection uptime > 99%
- State sync latency < 500ms (target: < 200ms)
- Support 10+ concurrent users per session
- Support 100+ concurrent sessions

### User Experience Metrics
- All clients see same time (±1 second)
- Actions reflect within 1 second
- No visible lag or jitter
- Reconnection happens seamlessly

---

## Next Steps

1. **Decision Point**: Confirm WebSocket approach
2. **Setup**: Create backend project structure
3. **Prototype**: Build minimal WebSocket server + client
4. **Validate**: Test synchronization with 2+ clients
5. **Iterate**: Build out full feature set

---

## Timeline Estimate

- **Phase 1**: Backend Infrastructure - 3-4 days
- **Phase 2**: Frontend Integration - 3-4 days
- **Phase 3**: Synchronization & Testing - 2-3 days
- **Phase 4**: Session Management UI - 2-3 days
- **Phase 5**: Deployment & Documentation - 2 days

**Total Estimated Time**: 12-16 days (2-3 weeks)

This is a significant feature that changes the fundamental architecture. Recommend breaking into smaller user stories if needed.
