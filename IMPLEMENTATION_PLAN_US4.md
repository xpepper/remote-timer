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

## Recommended Approach: HTMX + SSE Extension

### Why HTMX SSE Extension is the Right Choice

**Project Context:**
- **Already using HTMX** - Leverage existing technology stack
- **Server-rendered philosophy** - Align with HTMX's hypermedia-driven approach
- **Minimal JavaScript** - Keep frontend complexity low

**Timer Characteristics:**
- **Update frequency**: 1 update/second (low-frequency)
- **Data flow**: Primarily server → client (timer ticks)
- **User actions**: Infrequent (start/pause/reset every few minutes)
- **Simplicity**: No need for complex bidirectional protocol

**HTMX SSE Extension Advantages:**
1. **HTMX-native** - Built-in support for swapping HTML fragments from SSE events
2. **Declarative** - Configure via HTML attributes, not JavaScript
3. **Automatic reconnection** - Built into the extension
4. **Standard HTTP** - Easy deployment, no special configuration
5. **Server renders HTML** - Send HTML fragments, not JSON
6. **Perfect fit** - Combines SSE streaming with HTMX swapping

**When to Use WebSockets Instead:**
- High-frequency updates (10+ per second)
- Frequent client → server messages
- Real-time gaming, chat, collaborative editing
- Need for bidirectional streaming

**Our timer doesn't need any of these!**

### Architecture Design

```
┌──────────────────────────────────────────────────────────────┐
│                     Frontend (Browser)                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  index.html (HTMX-powered)                           │    │
│  │  ┌────────────────────────────────────────────┐     │    │
│  │  │ <div hx-ext="sse"                          │     │    │
│  │  │      sse-connect="/events/:sessionId">     │     │    │
│  │  │                                             │     │    │
│  │  │   <!-- Timer Display -->                   │     │    │
│  │  │   <div id="timer" sse-swap="tick">         │     │    │
│  │  │     25:00                                   │     │    │
│  │  │   </div>                                    │     │    │
│  │  │                                             │     │    │
│  │  │   <!-- Control Buttons -->                 │     │    │
│  │  │   <button hx-post="/timer/start">Start</button> │    │
│  │  │   <button hx-post="/timer/pause">Pause</button> │    │
│  │  │   <button hx-post="/timer/reset">Reset</button> │    │
│  │  │                                             │     │    │
│  │  └────────────────────────────────────────────┘     │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ▲                                              │              │
│  │ SSE Stream (HTML fragments)                 │ HTTP POST    │
│  │ event: tick                                 ▼              │
│  │ data: <div>24:59</div>                                     │
│  │                                                             │
└──┼─────────────────────────────────────────────┼──────────────┘
   │                                              │
   │                                              │
┌──┼──────────────────────────────────────────────┼──────────────┐
│  │           Express.js Server                  │              │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                           │ │
│  │  HTMX Endpoints (respond with HTML fragments):           │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ POST /timer/start                                  │ │ │
│  │  │   → Returns: <button disabled>Start</button>       │ │ │
│  │  │                                                     │ │ │
│  │  │ POST /timer/pause                                  │ │ │
│  │  │   → Returns: <button>Resume</button>               │ │ │
│  │  │                                                     │ │ │
│  │  │ POST /timer/reset                                  │ │ │
│  │  │   → Returns: <div>25:00</div>                      │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │                           │                              │ │
│  │                           ▼                              │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │         Session Manager                            │ │ │
│  │  │  - Manages timer sessions                          │ │ │
│  │  │  - Handles user actions                            │ │ │
│  │  │  - Updates shared state                            │ │ │
│  │  │  - Broadcasts via SSE                              │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │                           │                              │ │
│  │                           ▼                              │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │         Shared Timer State                         │ │ │
│  │  │  {                                                  │ │ │
│  │  │    sessionId: "abc123",                            │ │ │
│  │  │    duration: 1500,                                 │ │ │
│  │  │    remainingTime: 1200,                            │ │ │
│  │  │    isRunning: true,                                │ │ │
│  │  │    isPaused: false,                                │ │ │
│  │  │    clients: Set<Response>  // SSE connections      │ │ │
│  │  │  }                                                  │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │                           │                              │ │
│  │                           ▼                              │ │
│  │  SSE Endpoint:                                           │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │ GET /events/:sessionId                             │ │ │
│  │  │  - Opens SSE connection                            │ │ │
│  │  │  - Sends HTML fragments as SSE events:             │ │ │
│  │  │                                                     │ │ │
│  │  │    event: tick                                     │ │ │
│  │  │    data: <div id="timer">24:59</div>               │ │ │
│  │  │                                                     │ │ │
│  │  │    event: state                                    │ │ │
│  │  │    data: <div id="controls">...</div>              │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                   Backend (Node.js Server)                     │
└─────────────────────────────────────────────────────────────────┘
```

### State Flow

1. **User Action** (e.g., clicks Start button)
   - HTMX sends POST to `/timer/start` (via `hx-post`)
   - Server updates shared state
   - Server responds with HTML fragment (e.g., updated button state)
   - HTMX swaps response into DOM
   - Server broadcasts update via SSE to all connected clients
    
2. **Server Processing**
   - REST endpoint receives action
   - Updates session state in memory
   - Renders HTML fragment for response
   - Sends SSE events (HTML fragments) to all clients subscribed to that session
    
3. **All Clients Receive Update via SSE**
   - HTMX SSE extension receives event
   - Extension automatically swaps HTML fragment into DOM (via `sse-swap`)
   - No JavaScript needed - purely declarative
    
4. **Timer Tick** (every second)
   - Server-side interval decrements time
   - Server renders HTML fragment (e.g., `<div>24:59</div>`)
   - Broadcasts as SSE event with name "tick"
   - HTMX SSE extension swaps fragment into all clients simultaneously

### SSE Event Format

**Server → Client (HTMX SSE Extension receives HTML, not JSON):**
```
event: tick
data: <div id="timer-display">24:59</div>

event: state
data: <div id="controls"><button hx-post="/timer/pause">Pause</button></div>

event: user-joined
data: <div id="user-count">3 users connected</div>
```

**Key Difference from Traditional SSE:**
- Server sends **HTML fragments**, not JSON
- HTMX automatically swaps HTML into DOM
- No JavaScript needed to parse or render
- Server controls presentation logic

---

## Implementation Phases

### Phase 1: Backend Infrastructure (2-3 days)
**Goal**: Set up SSE server that renders and broadcasts HTML fragments

**Tasks:**
1. Create `server/` directory structure
2. Initialize Node.js backend project
3. Install dependencies: express, cors, typescript
4. Set up TypeScript configuration for backend
5. Create basic Express server with SSE endpoint
6. Implement session management (in-memory Map)
7. Create HTML template rendering functions
8. Implement HTMX-compatible REST endpoints (respond with HTML)
9. Implement SSE broadcasting of HTML fragments
10. Write backend unit tests for session management

**Files to Create:**
- `server/package.json`
- `server/tsconfig.json`
- `server/src/index.ts` - Main server file
- `server/src/session-manager.ts` - Session state management
- `server/src/timer-service.ts` - Server-side timer logic
- `server/src/sse-handler.ts` - SSE connection management
- `server/src/templates.ts` - HTML fragment rendering functions
- `types/timer.ts` - Shared TypeScript types (internal state)
- `server/src/session-manager.test.ts` - Tests

**Key Code - SSE Endpoint (sends HTML fragments):**
```typescript
// GET /events/:sessionId
app.get('/events/:sessionId', (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const sessionId = req.params.sessionId;
  const session = sessionManager.getOrCreateSession(sessionId);
  
  // Add client to session
  session.addClient(res);
  
  // Send initial state as HTML fragment
  const initialHtml = renderTimerDisplay(session.getState());
  res.write(`event: tick\n`);
  res.write(`data: ${initialHtml}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    session.removeClient(res);
  });
});
```

**Key Code - HTMX Action Endpoint (returns HTML fragment):**
```typescript
// POST /sessions/:sessionId/start
app.post('/sessions/:sessionId/start', (req, res) => {
  const { sessionId } = req.params;
  const { duration } = req.body;
  
  const session = sessionManager.getSession(sessionId);
  session.startTimer(duration);
  
  // broadcastTimerUI() is called inside startTimer()
  // It sends complete UI to all clients via SSE
  
  // Return complete UI to the requesting client (HTMX will swap it)
  const html = renderTimerUI(sessionId, session.getState());
  res.send(html);
});

// POST /sessions/:sessionId/pause
app.post('/sessions/:sessionId/pause', (req, res) => {
  const { sessionId } = req.params;
  const session = sessionManager.getSession(sessionId);
  
  session.pauseTimer();
  
  // Return updated UI
  const html = renderTimerUI(sessionId, session.getState());
  res.send(html);
});

// Similar for /resume and /reset
```

**Key Insight:**
- ✅ All endpoints return **the same thing**: complete timer UI
- ✅ No need to think about "which fragment changed" - always send complete UI
- ✅ HTMX swaps entire `#timer-ui` div
- ✅ All clients get SSE broadcast with same UI

**Key Code - HTML Rendering Functions:**
```typescript
// server/src/templates.ts

// Single function to render entire timer UI
export function renderTimerUI(sessionId: string, state: TimerState): string {
  // Format time
  const minutes = Math.floor(state.remainingTime / 60);
  const seconds = state.remainingTime % 60;
  const time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Render complete UI in one fragment
  return `
    <div id="timer-ui">
      <div class="timer-display">${time}</div>
      <div class="controls">
        ${renderControlButtons(sessionId, state)}
      </div>
      <div class="user-count">${state.connectedUsers || 1} user(s) connected</div>
    </div>
  `;
}

// Helper: Render control buttons based on state
function renderControlButtons(sessionId: string, state: TimerState): string {
  if (state.isRunning && !state.isPaused) {
    // Timer is running - show Pause + Reset
    return `
      <button class="btn-start" disabled>Start</button>
      <button class="btn-pause" hx-post="/sessions/${sessionId}/pause">Pause</button>
      <button class="btn-reset" hx-post="/sessions/${sessionId}/reset">Reset</button>
    `;
  } else if (state.isPaused) {
    // Timer is paused - show Resume + Reset
    return `
      <button class="btn-start" disabled>Start</button>
      <button class="btn-resume" hx-post="/sessions/${sessionId}/resume">Resume</button>
      <button class="btn-reset" hx-post="/sessions/${sessionId}/reset">Reset</button>
    `;
  } else {
    // Timer is stopped - show Start + Reset
    return `
      <button class="btn-start" hx-post="/sessions/${sessionId}/start" hx-vals='{"duration": 1500}'>Start</button>
      <button class="btn-pause" disabled>Pause</button>
      <button class="btn-reset" hx-post="/sessions/${sessionId}/reset">Reset</button>
    `;
  }
}
```

**Why This is Simpler:**
- ✅ **One function** renders entire UI (timer + buttons + user count)
- ✅ **One SSE event** type: `timer-update`
- ✅ **Buttons automatically match state** (disabled when not applicable)
- ✅ **No need to track** which parts changed
- ✅ **Server is single source of truth** for all presentation logic

**Key Code - Session Broadcasting HTML:**
```typescript
// server/src/session-manager.ts
class Session {
  private clients: Set<Response> = new Set();
  private intervalId?: NodeJS.Timeout;
  
  startTimer(duration: number) {
    this.state.duration = duration;
    this.state.remainingTime = duration;
    this.state.isRunning = true;
    this.state.isPaused = false;
    
    // Start interval - broadcast complete UI every second
    this.intervalId = setInterval(() => {
      this.state.remainingTime--;
      
      if (this.state.remainingTime <= 0) {
        this.stopTimer();
      }
      
      // Broadcast entire UI to all clients
      this.broadcastTimerUI();
    }, 1000);
    
    // Broadcast immediately
    this.broadcastTimerUI();
  }
  
  broadcastTimerUI() {
    // Render complete timer UI
    const html = renderTimerUI(this.id, this.state);
    
    // Send as single SSE event
    const sseMessage = `event: timer-update\ndata: ${html}\n\n`;
    
    this.clients.forEach(client => {
      try {
        client.write(sseMessage);
      } catch (error) {
        // Remove dead connections
        this.clients.delete(client);
      }
    });
  }
}
```

**Simplification Highlights:**
- 🎯 **Single broadcast method**: `broadcastTimerUI()` instead of separate `broadcastHTML()` calls
- 🎯 **One SSE event**: `timer-update` instead of `tick`, `controls`, `user-count`, etc.
- 🎯 **Automatic sync**: Timer value + button states always match

**Deliverables:**
- Running Express server on localhost:3000
- SSE endpoint streaming HTML fragments
- HTMX-compatible REST endpoints returning HTML
- HTML template rendering functions
- Session creation and joining
- HTML fragment broadcasting via SSE

### Phase 2: Frontend Integration (1-2 days)
**Goal**: Update HTML to use HTMX SSE extension - pure declarative approach

**Tasks:**
1. Include HTMX core library via CDN
2. Include HTMX SSE extension via CDN
3. Update `index.html` with HTMX attributes
4. Add `hx-ext="sse"` and `sse-connect` attributes
5. Add `sse-swap` attributes to elements that receive updates
6. Add `hx-post` attributes to action buttons
7. Add session ID generation/input UI
8. Remove or refactor `src/timer.ts` (no longer needed for state management)
9. Test frontend with backend

**Files to Modify:**
- `index.html` - Complete rewrite with HTMX attributes
- Potentially remove/refactor `src/timer.ts` (state now managed by server)
- Update build configuration if needed

**Key Code - Updated index.html:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Remote Timer</title>
  
  <!-- HTMX Core -->
  <script src="https://unpkg.com/htmx.org@1.9.10"></script>
  
  <!-- HTMX SSE Extension -->
  <script src="https://unpkg.com/htmx.org/dist/ext/sse.js"></script>
  
  <style>
    body { font-family: sans-serif; text-align: center; padding: 50px; }
    .timer-display { font-size: 72px; font-weight: bold; margin: 20px; }
    .controls { margin: 20px; }
    button { font-size: 18px; padding: 10px 20px; margin: 5px; cursor: pointer; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  </style>
</head>
<body>
  <h1>Remote Timer</h1>
  
  <!-- SSE Container -->
  <div hx-ext="sse" sse-connect="/events/default">
    
    <!-- Single swap target - entire timer UI gets replaced -->
    <div id="timer-ui" sse-swap="timer-update">
      <!-- Initial state (will be immediately replaced by SSE) -->
      <div class="timer-display">25:00</div>
      <div class="controls">
        <button class="btn-start" hx-post="/sessions/default/start" hx-vals='{"duration": 1500}'>Start</button>
        <button class="btn-pause" disabled>Pause</button>
        <button class="btn-reset" hx-post="/sessions/default/reset">Reset</button>
      </div>
      <div class="user-count">1 user(s) connected</div>
    </div>
    
  </div>
</body>
</html>
```

**That's it! The entire frontend.**

**What happens:**
1. Page loads, connects to `/events/default` via SSE
2. Server immediately sends initial state via `timer-update` event
3. HTMX swaps entire `#timer-ui` div with server-rendered HTML
4. User clicks "Start" → HTMX posts to `/sessions/default/start`
5. Server responds with updated `#timer-ui` HTML (button now disabled, timer running)
6. HTMX swaps the UI
7. Every second, server broadcasts `timer-update` via SSE to all connected clients
8. All clients automatically update (timer counts down, buttons reflect state)

**Zero JavaScript needed for timer logic!**

**What We DON'T Need:**
- ❌ `src/api-client.ts` - HTMX handles all HTTP requests
- ❌ `src/sse-client.ts` - HTMX SSE extension handles SSE
- ❌ Client-side state management - Server owns all state
- ❌ JSON parsing/rendering - Server sends HTML directly
- ❌ Manual DOM manipulation - HTMX swaps HTML automatically

**What Happens to src/timer.ts:**
- Option 1: Remove entirely (state managed by server)
- Option 2: Keep as TypeScript types only (if shared with backend)
- Option 3: Refactor to utility functions (format time, etc.)

**Updated Frontend Architecture:**
```
┌─────────────────────────────────┐
│  index.html                     │
│  - HTMX attributes              │
│  - No JavaScript state          │
│  - Declarative event handling   │
└─────────────────────────────────┘
         ↕ HTML Fragments
┌─────────────────────────────────┐
│  Express Server                 │
│  - Renders HTML                 │
│  - Manages state                │
│  - Broadcasts via SSE           │
└─────────────────────────────────┘
```

**Testing Changes:**
- Frontend tests become simpler (less state to test)
- Focus on integration tests (server + HTMX together)
- Can still test HTML rendering functions on backend

**Deliverables:**
- Frontend connects to backend via HTMX SSE extension
- Timer actions sent via `hx-post` attributes
- UI updates automatically from SSE events
- Minimal to zero JavaScript code
- Clean, declarative HTML

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

### Internal Server State (TypeScript)

The server maintains state internally using TypeScript interfaces. **This state is NOT sent to clients** - instead, it's rendered into HTML fragments.

**Shared Timer State:**
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

**Session:**
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

### External API (HTML Fragments)

**SSE Events (Server → Client via HTMX SSE Extension):**

The server sends **HTML fragments**, not JSON. HTMX automatically swaps these into the DOM.

```
event: tick
data: <div id="timer-display">24:59</div>

event: controls
data: <div id="controls"><button hx-post="/timer/pause">Pause</button><button hx-post="/timer/reset">Reset</button></div>

event: user-count
data: <div id="user-count">3 users connected</div>
```

**HTMX POST Requests (Client → Server):**

Buttons use `hx-post` attribute to send actions:

```html
<!-- User clicks this -->
<button hx-post="/timer/start" hx-vals='{"sessionId": "abc123", "duration": 1500}'>
  Start
</button>

<!-- Server responds with HTML fragment -->
<button hx-post="/timer/start" hx-vals='{"sessionId": "abc123", "duration": 1500}' disabled>
  Start
</button>
```

**REST API Endpoints (HTMX Compatible):**

All endpoints return **HTML fragments**, not JSON. The `sessionId` is in the URL path.

**Page Rendering:**
- `GET /` - Render home page with session creation/join UI
- `GET /sessions/:sessionId` - Render full timer page for a session
  - Response: Complete HTML page with sessionId embedded in all attributes

**Session Management:**
- `POST /sessions/create` - Create new session
  - Response: Redirect to `/sessions/:newSessionId` or return session UI HTML
- `POST /sessions/:id/join` - Join existing session  
  - Response: Redirect to `/sessions/:id` or return timer HTML

**Timer Actions (return HTML for the element that triggered the action):**
- `POST /sessions/:sessionId/start` 
  - Body: `{ duration: 1500 }`
  - Response: `<button hx-post="/sessions/:sessionId/start" disabled>Start</button>`
  
- `POST /sessions/:sessionId/pause`
  - Response: `<button hx-post="/sessions/:sessionId/resume">Resume</button>`
  
- `POST /sessions/:sessionId/resume`
  - Response: `<button hx-post="/sessions/:sessionId/pause">Pause</button>`
  
- `POST /sessions/:sessionId/reset`
  - Response: `<button hx-post="/sessions/:sessionId/start" hx-vals='{"duration": 1500}'>Start</button>`

**SSE Stream:**
- `GET /events/:sessionId` - Open SSE connection
  - Returns: Server-Sent Events stream with HTML fragments

### Key Differences from Traditional REST API

| Traditional API | HTMX API |
|----------------|----------|
| Returns JSON: `{"time": 1499}` | Returns HTML: `<div>24:59</div>` |
| Client parses and renders | Server renders, client swaps |
| Client manages presentation | Server manages presentation |
| Need JavaScript to update DOM | HTMX declaratively updates DOM |

### Example Full Flow

1. **User navigates to session page:**
   - Browser: `GET /sessions/abc123`
   - Server renders complete HTML page with sessionId="abc123" embedded

2. **Page loads, HTMX SSE connects:**
   ```html
   <div hx-ext="sse" sse-connect="/events/abc123">
   ```
   - SSE stream opens: `/events/abc123`
   - Server sends initial state as HTML

3. **User clicks Start button:**
   ```html
   <button hx-post="/sessions/abc123/start" hx-vals='{"duration": 1500}'>Start</button>
   ```

4. **Server receives POST:**
   ```
   POST /sessions/abc123/start
   Body: { duration: 1500 }
   ```

5. **Server updates state:**
   ```typescript
   session.startTimer(1500);
   ```

6. **Server responds with updated button HTML:**
   ```html
   <button hx-post="/sessions/abc123/start" disabled>Start</button>
   ```

7. **HTMX swaps button** (button now disabled on the requesting client)

8. **Server broadcasts to all clients via SSE:**
   ```
   event: tick
   data: <div id="timer-display">24:59</div>
   
   event: controls
   data: <div id="controls">
     <button hx-post="/sessions/abc123/start" disabled>Start</button>
     <button hx-post="/sessions/abc123/pause">Pause</button>
     <button hx-post="/sessions/abc123/reset">Reset</button>
   </div>
   ```

9. **All clients' HTMX extensions receive and swap HTML automatically**
   - Timer display updates to 24:59
   - Control buttons update (Start disabled, Pause enabled)
   - No JavaScript needed!

**Key Points:**
- ✅ SessionId in URL path (clean, RESTful)
- ✅ Server renders all HTML (single source of truth for presentation)
- ✅ HTMX handles all DOM updates (declarative)
- ✅ SSE broadcasts keep all clients in sync

---

## Migration Strategy

### Backward Compatibility Approach

Since we're moving from a pure client-side app to a client-server architecture with HTMX, we need a careful migration strategy.

**Current Architecture:**
- `index.html` - UI with event handlers
- `src/timer.ts` - Timer class with local state
- `src/timer.test.ts` - Unit tests for Timer class

**Target Architecture:**
- `index.html` - HTMX-powered UI (declarative)
- `server/` - Express server rendering HTML
- Minimal/no client-side JavaScript

### Migration Phases

#### Phase 1: Keep Both Systems (Parallel Development)
**Duration:** During backend development (2-3 days)

1. **Create server directory separately**
   - Don't touch existing frontend code
   - Build backend in isolation
   - Test backend with manual HTTP/SSE clients

2. **Keep existing app working**
   - Current `index.html` and `src/timer.ts` unchanged
   - Users can still use local timer
   - No disruption during development

**Directory Structure:**
```
remote-timer/
├── index.html (current version)
├── src/
│   ├── timer.ts (current version)
│   └── timer.test.ts (current version)
├── server/ (new)
│   ├── src/
│   │   ├── index.ts
│   │   ├── session-manager.ts
│   │   └── templates.ts
│   └── package.json
```

#### Phase 2: Create New HTMX Frontend (Side-by-Side)
**Duration:** During frontend integration (1-2 days)

1. **Create alternative HTML file**
   - Create `index-remote.html` with HTMX
   - Keep `index.html` as local version
   - Test both versions

2. **Decision point:**
   - Option A: Keep both (local + remote modes)
   - Option B: Replace local with remote
   - Recommend: **Option B** for simplicity

**Directory Structure:**
```
remote-timer/
├── index.html (current - local timer)
├── index-remote.html (new - HTMX version)
├── src/
│   └── timer.ts (still used by index.html)
└── server/
```

#### Phase 3: Switch to HTMX as Default
**Duration:** After testing (1 day)

1. **Make HTMX version the default**
   ```bash
   mv index.html index-local.html.bak
   mv index-remote.html index.html
   ```

2. **Update documentation**
   - README points to server setup
   - Document how to run server + client

3. **Archive old code (don't delete yet)**
   - Keep `index-local.html.bak` for reference
   - Keep `src/timer.ts` temporarily

#### Phase 4: Cleanup (Final)
**Duration:** After 1 week of successful operation

1. **Remove old code**
   - Delete `index-local.html.bak`
   - Delete `src/timer.ts` (or refactor to utilities)
   - Remove old tests or adapt to new architecture

2. **Final structure:**
   ```
   remote-timer/
   ├── index.html (HTMX version)
   ├── server/
   │   ├── src/
   │   │   ├── index.ts
   │   │   ├── session-manager.ts
   │   │   ├── session-manager.test.ts
   │   │   ├── templates.ts
   │   │   └── timer-service.ts
   │   ├── package.json
   │   └── tsconfig.json
   ├── package.json (frontend build, if needed)
   └── README.md (updated)
   ```

### What Happens to Existing Tests?

**Current tests (`src/timer.test.ts`):**
- Test the `Timer` class with local state
- Won't be needed if we remove client-side state

**New testing approach:**
1. **Backend unit tests:**
   - Test session management logic
   - Test HTML rendering functions
   - Test timer state transitions

2. **Integration tests:**
   - Test SSE connections
   - Test full request/response cycles
   - Test multi-client synchronization

3. **Optional: Keep some frontend tests**
   - If we keep any JavaScript utilities
   - Test session ID generation
   - Test reconnection UI

### Risk Mitigation

**Risk:** Breaking existing functionality during migration

**Mitigation:**
- Keep both versions running during development
- Test thoroughly before switching defaults
- Have rollback plan (restore old `index.html`)

**Risk:** Users lose work during transition

**Mitigation:**
- No server-side persistence yet = no data to lose
- Timer state is ephemeral anyway
- Clear communication if deployed publicly

**Risk:** Increased complexity (now need server)

**Mitigation:**
- Document server setup clearly
- Provide docker-compose for easy local development
- Consider deployment to free hosting (Railway, Render)

### Development Workflow During Migration

**Local development:**
```bash
# Terminal 1: Run backend server
cd server
npm install
npm run dev   # Express server on :3000

# Terminal 2: Run frontend dev server (Vite)
npm run dev   # Vite on :5173

# Access HTMX version at: http://localhost:5173/index-remote.html
```

**Testing both versions:**
- Local version: `http://localhost:5173/index.html`
- Remote version: `http://localhost:5173/index-remote.html`

This strategy ensures we can develop the new architecture without breaking existing functionality.

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
- SSE connection uptime > 99%
- State sync latency < 500ms (target: < 200ms)
- HTML fragment render time < 50ms on server
- Support 10+ concurrent users per session
- Support 100+ concurrent sessions
- SSE automatic reconnection works seamlessly

### User Experience Metrics
- All clients see same time (±1 second)
- Actions reflect within 1 second
- No visible lag or jitter in timer display
- Reconnection happens seamlessly (no user intervention)
- Buttons update state instantly on action

### HTMX-Specific Metrics
- HTML fragment size < 1KB per event
- DOM swap performance < 16ms (60fps)
- No JavaScript errors in browser console
- SSE events processed in order
- No missed timer ticks during normal operation

---

## Next Steps

1. **Review and approve this implementation plan**
2. **Begin Phase 1**: Set up backend server with Express + SSE
3. **Develop HTML rendering functions**: Create templates.ts
4. **Test backend independently**: Use curl or Postman to test endpoints
5. **Begin Phase 2**: Update frontend HTML with HTMX attributes
6. **Integration testing**: Connect HTMX frontend to backend
7. **Iterate through Phases 3-5**

---

## Timeline Estimate

- **Phase 1**: Backend Infrastructure - 2-3 days
- **Phase 2**: Frontend Integration - 1-2 days (simplified with HTMX!)
- **Phase 3**: Synchronization & Testing - 2-3 days
- **Phase 4**: Session Management UI - 2-3 days
- **Phase 5**: Deployment & Documentation - 2 days

**Total Estimated Time**: 9-13 days (~2 weeks)

**HTMX Advantages for Timeline:**
- **Faster Phase 2**: No need to write API clients or SSE handlers (save 1 day)
- Simpler than WebSockets = faster development overall
- No client library needed = less setup time
- Standard HTTP = easier deployment
- Fewer edge cases = less debugging time
- Server-rendered HTML = single source of presentation logic

**Time Savings with HTMX:**
- Traditional approach (EventSource + fetch): ~11-15 days
- HTMX approach: ~9-13 days
- **Savings: ~2 days** due to simplified frontend

This is a significant feature that changes the fundamental architecture. Consider breaking into smaller user stories if timeline is a concern.

---

## Summary: Why HTMX + SSE is the Right Choice

### Comparison Table

| Aspect | HTMX + SSE Extension | Traditional SSE + EventSource | WebSockets |
|--------|---------------------|------------------------------|------------|
| **Complexity** | Simple (declarative HTML) | Medium (JavaScript clients) | Complex (protocol + state) |
| **Frontend Code** | Minimal (just HTML attributes) | Moderate (API/SSE clients) | Moderate (Socket.io client) |
| **Update Frequency** | Perfect for 1/sec | Perfect for 1/sec | Overkill for 1/sec |
| **Browser Support** | HTMX via CDN | Native EventSource | Needs library |
| **Deployment** | Standard HTTP | Standard HTTP | May need config |
| **Debugging** | Easy (network tab) | Easy (network tab) | Harder (special tools) |
| **Reconnection** | Automatic (built-in) | Automatic (built-in) | Manual implementation |
| **Bidirectional** | No (but we don't need it!) | No (but we don't need it!) | Yes |
| **Server Response** | HTML fragments | JSON | JSON |
| **Client Rendering** | Server-rendered | Client-rendered | Client-rendered |
| **Philosophy** | Hypermedia-driven | Traditional SPA | Traditional SPA |
| **Best For** | Aligned with HTMX project | Generic web apps | Real-time gaming/chat |
| **Time to Implement** | 9-13 days | 11-15 days | 12-16 days |

### Decision Matrix

**Choose HTMX + SSE Extension when:**
- ✅ Already using HTMX in your project (we are!)
- ✅ Want server-rendered, hypermedia-driven architecture
- ✅ Update frequency is low (< 10/second)
- ✅ Want minimal frontend complexity
- ✅ Team prefers server-side rendering
- ✅ Updates are primarily server → client

**Choose Traditional SSE when:**
- ⚠️ Not using HTMX (need more client-side control)
- ⚠️ Want client-side rendering with frameworks (React, Vue)
- ✅ Update frequency is low (< 10/second)
- ⚠️ Need to send complex data structures (prefer JSON)

**Choose WebSockets when:**
- ❌ High-frequency updates (10+ per second)
- ❌ Frequent bidirectional communication
- ❌ Real-time gaming, collaborative editing
- ❌ Need guaranteed message delivery

### Our Timer Application

**Requirements:**
- Update frequency: 1 update/second ✅ Low-frequency
- Data flow: Primarily server → client ✅ One-way dominant
- User actions: Infrequent (every few minutes) ✅ Rare client → server
- Project stack: Already using HTMX ✅ Perfect alignment
- Team preference: Minimal JavaScript ✅ HTMX philosophy

**Conclusion**: **HTMX + SSE Extension is the optimal choice** because:
1. ✅ Aligns with existing HTMX stack
2. ✅ Leverages server-side rendering strengths
3. ✅ Minimizes frontend complexity
4. ✅ Perfect for our update frequency (1/sec)
5. ✅ Faster implementation than alternatives
6. ✅ Simpler maintenance and debugging

### Key Insight: Server-Side Rendering with Real-Time Updates

The HTMX approach combines the best of both worlds:
- **Server-Side Rendering**: Server owns presentation logic (HTML rendering)
- **Real-Time Updates**: SSE provides live streaming of HTML fragments
- **Declarative Frontend**: HTMX handles DOM swapping automatically
- **Zero JavaScript**: No client-side state or rendering logic needed

This is the modern, hypermedia-driven approach to real-time web applications.

---

## Next Steps

1. **Review and approve this plan**
2. **Begin Phase 1**: Set up backend server with HTML rendering
3. **Test backend** with manual SSE connections
4. **Begin Phase 2**: Update frontend with HTMX attributes
5. **Iterate** through remaining phases

**Ready to start implementation?** The plan is comprehensive and actionable!
