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

### Option 1: Server-Sent Events (SSE) with REST API (RECOMMENDED)
**Pros:**
- **Perfect for timer use case**: Updates only once per second
- **Simpler than WebSockets**: Standard HTTP, no special protocols
- **Native browser support**: EventSource API built-in
- **Works with existing infrastructure**: No special proxy/load balancer config
- **Easy to debug**: Standard HTTP requests visible in DevTools
- **Automatic reconnection**: EventSource handles reconnects automatically
- **Lower complexity**: No connection state management needed
- **Better for low-frequency updates**: 1 update/second is low-frequency

**Cons:**
- Unidirectional (server to client only) - but this is fine! Client actions use REST API
- Connection limits in some browsers (6 per domain) - not an issue for our use case

**Why SSE is Better for Timer:**
- Timer updates are **one-way**: server → clients (perfect for SSE)
- Update frequency is **low**: 1 update/second (SSE handles this efficiently)
- User actions are **infrequent**: start/pause/reset (REST API is fine)
- **Simpler architecture**: No need for bidirectional protocol
- **Standard HTTP**: Easier deployment, debugging, monitoring

**Implementation:**
- Backend: Node.js + Express
- Frontend: EventSource API + fetch for actions
- State: In-memory storage (or Redis for scalability)

### Option 2: WebSockets with Node.js Backend
**Pros:**
- Bidirectional real-time communication
- Efficient for high-frequency updates
- Node.js integrates well with existing TypeScript codebase
- Mature ecosystem (Socket.io, ws library)
- Can share TypeScript types between frontend and backend

**Cons:**
- **Overkill for timer**: We don't need bidirectional communication
- **More complex**: Connection management, heartbeats, reconnection logic
- **Harder deployment**: May need special load balancer configuration
- **Unnecessary for 1 update/second**: WebSockets shine at 10+ updates/second

**Why NOT WebSockets for Timer:**
- Updates are already infrequent (1/second)
- User actions are rare (start/pause every few minutes)
- Adds complexity without benefit for this use case

**Implementation:**
- Backend: Node.js + Express + Socket.io
- Frontend: Socket.io client library
- State: In-memory storage (or Redis for scalability)

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

### Option 3: Simple HTTP Polling
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

## Recommended Approach: Server-Sent Events (SSE) with REST API

### Why SSE is the Right Choice

**Timer Characteristics:**
- **Update frequency**: 1 update/second (low-frequency)
- **Data flow**: Primarily server → client (timer ticks)
- **User actions**: Infrequent (start/pause/reset every few minutes)
- **Simplicity**: No need for complex bidirectional protocol

**SSE Advantages for This Use Case:**
1. **Native browser support** - No additional libraries needed
2. **Automatic reconnection** - Built into EventSource API
3. **Standard HTTP** - Easy deployment, no special configuration
4. **Simple debugging** - Visible in browser DevTools
5. **Perfect fit** - One-way streaming is exactly what we need

**When to Use WebSockets Instead:**
- High-frequency updates (10+ per second)
- Frequent client → server messages
- Real-time gaming, chat, collaborative editing
- Need for bidirectional streaming

**Our timer doesn't need any of these!**

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌─────────────┐    ┌────────────┐     │
│  │  index.html  │───▶│  Timer UI   │───▶│ EventSource│────┐│
│  │              │    │  Component  │    │ (SSE Client)│    ││
│  └──────────────┘    └──────┬──────┘    └────────────┘    ││
│                             │                               ││
│                             │ User Actions (REST API)       ││
│                             │ POST /api/timer/start         ││
│                             │ POST /api/timer/pause         ││
│                             │ POST /api/timer/reset         ││
│                             ▼                               ││
│                      ┌─────────────┐                        ││
│                      │    fetch    │                        ││
│                      └──────┬──────┘                        ││
│                             │                               ││
└─────────────────────────────┼───────────────────────────────┘│
                              │                                │
                              │ HTTP POST                      │ SSE Stream
                              │                                │ (timer updates)
┌─────────────────────────────┼────────────────────────────────┘
│                             ▼                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Express.js Server                         │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │                                                         │ │
│  │  REST API Endpoints:                                   │ │
│  │  ┌──────────────────────────────────────────────┐     │ │
│  │  │ POST /api/session/create                     │     │ │
│  │  │ POST /api/session/:id/join                   │     │ │
│  │  │ POST /api/timer/:sessionId/start             │     │ │
│  │  │ POST /api/timer/:sessionId/pause             │     │ │
│  │  │ POST /api/timer/:sessionId/resume            │     │ │
│  │  │ POST /api/timer/:sessionId/reset             │     │ │
│  │  └──────────────────────────────────────────────┘     │ │
│  │                        │                               │ │
│  │                        ▼                               │ │
│  │  ┌──────────────────────────────────────────────┐     │ │
│  │  │         Session Manager                      │     │ │
│  │  │  - Manages timer sessions                    │     │ │
│  │  │  - Handles user actions                      │     │ │
│  │  │  - Updates shared state                      │     │ │
│  │  └──────────────────────────────────────────────┘     │ │
│  │                        │                               │ │
│  │                        ▼                               │ │
│  │  ┌──────────────────────────────────────────────┐     │ │
│  │  │         Shared Timer State                   │     │ │
│  │  │  {                                            │     │ │
│  │  │    sessionId: "abc123",                      │     │ │
│  │  │    duration: 1500,                           │     │ │
│  │  │    remainingTime: 1200,                      │     │ │
│  │  │    isRunning: true,                          │     │ │
│  │  │    isPaused: false,                          │     │ │
│  │  │    clients: Set<Response>  // SSE streams    │     │ │
│  │  │  }                                            │     │ │
│  │  └──────────────────────────────────────────────┘     │ │
│  │                        │                               │ │
│  │                        ▼                               │ │
│  │  SSE Endpoint:                                         │ │
│  │  ┌──────────────────────────────────────────────┐     │ │
│  │  │ GET /api/events/:sessionId                   │     │ │
│  │  │  - Opens SSE stream                          │     │ │
│  │  │  - Sends timer updates every second          │     │ │
│  │  │  - Sends state changes immediately           │     │ │
│  │  └──────────────────────────────────────────────┘     │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│                   Backend (Node.js Server)                   │
└───────────────────────────────────────────────────────────────┘
```

### State Flow

1. **User Action** (e.g., clicks Start button)
   - Frontend sends POST to `/api/timer/:sessionId/start`
   - Server updates shared state
   - Server broadcasts update via SSE to all connected clients
   
2. **Server Processing**
   - REST endpoint receives action
   - Updates session state in memory
   - Sends SSE event to all clients subscribed to that session
   
3. **All Clients Receive Update via SSE**
   - EventSource receives message
   - Update local UI to reflect new state
   - No local timer logic - server is source of truth

4. **Timer Tick** (every second)
   - Server-side interval decrements time
   - Broadcasts remaining time via SSE
   - All clients update display simultaneously

### SSE Event Format

**Server → Client (via EventSource):**
```javascript
// Timer tick update
data: {"type":"tick","remainingTime":1199,"isRunning":true}

// State change (start/pause/reset)
data: {"type":"state","state":{"duration":1500,"remainingTime":1500,"isRunning":true,"isPaused":false}}

// User joined/left
data: {"type":"user-joined","userId":"abc123","userCount":3}
data: {"type":"user-left","userId":"abc123","userCount":2}
```

---

## Implementation Phases

### Phase 1: Backend Infrastructure (2-3 days)
**Goal**: Set up basic SSE server with state management

**Tasks:**
1. Create `server/` directory structure
2. Initialize Node.js backend project
3. Install dependencies: express, cors, typescript
4. Set up TypeScript configuration for backend
5. Create basic Express server with SSE endpoint
6. Implement session management (in-memory Map)
7. Create shared types file (`types/timer.ts`)
8. Implement REST API endpoints for timer actions
9. Write backend unit tests for session management

**Files to Create:**
- `server/package.json`
- `server/tsconfig.json`
- `server/src/index.ts` - Main server file
- `server/src/session-manager.ts` - Session state management
- `server/src/timer-service.ts` - Server-side timer logic
- `server/src/sse-handler.ts` - SSE connection management
- `types/timer.ts` - Shared TypeScript types
- `server/src/session-manager.test.ts` - Tests

**Key Code - SSE Endpoint:**
```typescript
// GET /api/events/:sessionId
app.get('/api/events/:sessionId', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const sessionId = req.params.sessionId;
  const session = sessionManager.getSession(sessionId);
  
  // Add client to session
  session.addClient(res);
  
  // Send initial state
  res.write(`data: ${JSON.stringify({
    type: 'state',
    state: session.getState()
  })}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    session.removeClient(res);
  });
});
```

**Key Code - REST Action Endpoint:**
```typescript
// POST /api/timer/:sessionId/start
app.post('/api/timer/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  const { duration } = req.body;
  
  const session = sessionManager.getSession(sessionId);
  session.startTimer(duration);
  
  // Broadcast to all clients via SSE
  session.broadcast({
    type: 'state',
    state: session.getState()
  });
  
  res.json({ success: true });
});
```

**Deliverables:**
- Running Express server on localhost:3000
- SSE endpoint streaming events
- REST API for timer actions
- Session creation and joining
- Basic state broadcast

### Phase 2: Frontend Integration (2-3 days)
**Goal**: Connect frontend to backend using EventSource and fetch

**Tasks:**
1. Create `src/api-client.ts` - REST API wrapper
2. Create `src/sse-client.ts` - EventSource wrapper
3. Refactor `src/timer.ts` to become remote state interface
4. Update `index.html` to use SSE + REST API
5. Implement session joining UI
6. Handle connection/disconnection states
7. Update frontend tests (mock SSE and fetch)

**Files to Modify/Create:**
- `package.json` - No new dependencies needed! (EventSource is native)
- Create `src/api-client.ts` - REST API calls
- Create `src/sse-client.ts` - SSE event handling
- `src/timer.ts` - Refactor to remote state
- `index.html` - Update to use new clients
- Update `src/timer.test.ts`

**Key Code - SSE Client:**
```typescript
// src/sse-client.ts
export class SSEClient {
  private eventSource: EventSource | null = null;
  
  connect(sessionId: string, onMessage: (data: any) => void) {
    this.eventSource = new EventSource(
      `http://localhost:3000/api/events/${sessionId}`
    );
    
    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };
    
    this.eventSource.onerror = () => {
      console.error('SSE connection error');
      // Auto-reconnect handled by EventSource
    };
  }
  
  disconnect() {
    this.eventSource?.close();
  }
}
```

**Key Code - API Client:**
```typescript
// src/api-client.ts
export class APIClient {
  private baseUrl = 'http://localhost:3000/api';
  
  async startTimer(sessionId: string, duration: number) {
    await fetch(`${this.baseUrl}/timer/${sessionId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration })
    });
  }
  
  async pauseTimer(sessionId: string) {
    await fetch(`${this.baseUrl}/timer/${sessionId}/pause`, {
      method: 'POST'
    });
  }
  
  // ... other actions
}
```

**Deliverables:**
- Frontend connects to backend via SSE
- Timer actions sent via REST API
- UI updates from SSE events
- Connection status display

### Phase 3: Synchronization & Testing (2-3 days)
**Goal**: Ensure all clients stay synchronized

**Tasks:**
1. Test with multiple browser tabs/windows
2. Handle edge cases (disconnection, reconnection)
3. Test timer accuracy across clients
4. Load testing (simulate multiple users)
5. Integration tests
6. Handle SSE reconnection gracefully
7. Add loading/connecting states

**Testing Scenarios:**
- Multiple clients in same session
- Client joins mid-countdown
- Client disconnects and reconnects (SSE auto-reconnects)
- Network latency simulation
- Concurrent actions (two users click at same time)
- Long-running sessions (30+ minutes)

**SSE Reconnection Handling:**
- EventSource automatically reconnects on connection loss
- Server sends last known state on reconnection
- No special client code needed for basic reconnection

**Deliverables:**
- Stable multi-client synchronization
- Comprehensive test suite
- Performance benchmarks
- Edge case handling

### Phase 4: Session Management UI (2-3 days)
**Goal**: Allow users to create/join sessions

**Tasks:**
1. Add session creation UI
2. Generate/display session IDs or URLs
3. Allow joining by session ID
4. Show list of connected users (via SSE events)
5. Handle session lifecycle (create, destroy when empty)
6. Persist session ID in URL hash or localStorage
7. Add "copy session link" feature

**Files to Modify:**
- `index.html` - Add session management UI
- `server/src/session-manager.ts` - Session lifecycle

**Deliverables:**
- Users can create new sessions
- Users can join existing sessions
- Session ID visible and shareable
- User count displayed

### Phase 5: Deployment & Documentation (2 days)
**Goal**: Deploy to production and document usage

**Tasks:**
1. Choose deployment platform (Railway, Render, Fly.io)
2. Configure production build scripts
3. Set up environment variables
4. Deploy backend server
5. Update frontend to use production API URL
6. Deploy frontend (same server or separate)
7. Configure CORS properly
8. Update README with deployment info
9. Create user documentation

**Deployment Notes for SSE:**
- SSE works great with standard HTTP servers
- No special proxy configuration needed (unlike WebSockets)
- Works through most firewalls and proxies
- Standard HTTP load balancing works fine

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
  clients: Set<Response>;    // SSE response objects
  createdAt: number;
  lastActivity: number;
}

interface ClientInfo {
  id: string;
  connectedAt: number;
  // Future: username, avatar, etc.
}
```

### SSE Events (Server → Client)

**Event Types:**
```typescript
// Timer tick (sent every second when running)
{
  type: 'tick',
  remainingTime: number
}

// Full state update (on action: start/pause/reset)
{
  type: 'state',
  state: TimerState
}

// User joined session
{
  type: 'user-joined',
  userId: string,
  userCount: number
}

// User left session
{
  type: 'user-left',
  userId: string,
  userCount: number
}

// Error
{
  type: 'error',
  message: string
}
```

### REST API Endpoints (Client → Server)

**Session Management:**
- `POST /api/session/create` - Create new session
  - Response: `{ sessionId: string }`
- `POST /api/session/:id/join` - Join existing session
  - Response: `{ success: boolean, state: TimerState }`

**Timer Actions:**
- `POST /api/timer/:sessionId/start` - Start timer
  - Body: `{ duration: number }`
- `POST /api/timer/:sessionId/pause` - Pause timer
- `POST /api/timer/:sessionId/resume` - Resume timer
- `POST /api/timer/:sessionId/reset` - Reset timer

**SSE Stream:**
- `GET /api/events/:sessionId` - Open SSE connection
  - Returns: EventSource stream

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

### Risk 1: SSE Connection Reliability
**Mitigation:**
- EventSource has built-in automatic reconnection
- Show connection status in UI (eventSource.readyState)
- Fallback to local mode on persistent connection failure
- SSE is simpler - fewer failure modes than WebSockets

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

- **Phase 1**: Backend Infrastructure - 2-3 days
- **Phase 2**: Frontend Integration - 2-3 days
- **Phase 3**: Synchronization & Testing - 2-3 days
- **Phase 4**: Session Management UI - 2-3 days
- **Phase 5**: Deployment & Documentation - 2 days

**Total Estimated Time**: 10-14 days (2 weeks)

**SSE Advantages for Timeline:**
- Simpler than WebSockets = faster development
- No client library needed = less setup time
- Standard HTTP = easier deployment
- Fewer edge cases = less debugging time

This is a significant feature that changes the fundamental architecture. Recommend breaking into smaller user stories if needed.

---

## Summary: Why SSE is Better for This Timer

| Aspect | SSE | WebSockets |
|--------|-----|------------|
| **Complexity** | Simple HTTP | Complex protocol |
| **Update Frequency** | Perfect for 1/sec | Overkill |
| **Browser Support** | Native EventSource | Needs library |
| **Deployment** | Standard HTTP | May need config |
| **Debugging** | Easy (HTTP tools) | Harder |
| **Reconnection** | Automatic | Manual |
| **Bidirectional** | No (but we don't need it!) | Yes |
| **Best For** | One-way streaming | Two-way messaging |

**Conclusion**: SSE is the right tool for this job. WebSockets would add unnecessary complexity.
