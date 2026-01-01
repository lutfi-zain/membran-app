# Feature Specification: Navigation, Routing, and Onboarding Orchestration

**Feature Branch**: `005-navigation-routing`
**Created**: 2025-12-31
**Status**: Draft
**Input**: User description: "Navigation and routing: Landing page, dashboard, and onboarding flow orchestration"

---

## Overview

Server owners and prospective users need clear navigation paths through the membran.app application. This feature defines the public-facing landing page, the authenticated dashboard experience, and the orchestrated onboarding flow that guides new server owners from sign-up through bot connection and pricing tier configuration. It ensures all routes are properly registered and accessible, with clear progression between application states.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Landing Page Entry (Priority: P1)

A prospective visitor arrives at the membran.app root URL and needs to understand what the product offers and how to get started.

**Why this priority**: This is the first impression and entry point for all users. Without clear navigation from the root, visitors cannot discover or access the application's features. This blocks all user acquisition.

**Independent Test**: A visitor can navigate to the root URL, see a clear value proposition, and click "Start Free Trial" to begin sign-up or "Login" to access their existing account.

**Acceptance Scenarios**:

1. **Given** a visitor on the public landing page at `/`, **When** they view the page, **Then** they see the product name, a concise value proposition, and two primary call-to-action buttons
2. **Given** a visitor on the landing page, **When** they click "Start Free Trial", **Then** they are redirected to `/signup` to begin account creation
3. **Given** a visitor on the landing page, **When** they click "Login", **Then** they are redirected to `/login` to access their existing account
4. **Given** a visitor on the landing page, **When** they are already logged in and visit `/`, **Then** they are redirected to their dashboard (`/dashboard`)
5. **Given** a visitor on the landing page, **When** the page loads, **Then** it displays within 2 seconds on standard mobile or desktop connections

---

### User Story 2 - Dashboard Hub (Priority: P1)

An authenticated server owner logs in and needs a central hub to access their server settings, view connection status, and manage pricing tiers.

**Why this priority**: The dashboard is the home base for returning users. Without it, authenticated users have no clear destination after login and no unified access point to manage their server configuration.

**Independent Test**: A logged-in server owner can visit `/dashboard` and see an overview of their Discord server connection status, quick links to settings pages, and a summary of their pricing tier configuration.

**Acceptance Scenarios**:

1. **Given** an authenticated server owner who has completed onboarding, **When** they visit `/dashboard`, **Then** they see an overview with server name, connection status, and quick action buttons
2. **Given** an authenticated server owner, **When** they click "Manage Bot" on the dashboard, **Then** they are redirected to `/settings/bot`
3. **Given** an authenticated server owner, **When** they click "Configure Pricing" on the dashboard, **Then** they are redirected to `/settings/pricing`
4. **Given** an authenticated server owner, **When** they log in via `/login`, **Then** they are redirected to `/dashboard` upon successful authentication
5. **Given** an authenticated server owner who has not completed onboarding, **When** they visit `/dashboard`, **Then** they are redirected to resume onboarding at the appropriate step

---

### User Story 3 - Onboarding Flow Orchestration (Priority: P1)

A new server owner who has just created an account needs to be guided through connecting their Discord bot and configuring pricing tiers in a clear, sequential process.

**Why this priority**: Onboarding is the critical first experience that converts sign-ups into active users. Without proper orchestration, users may abandon the process due to confusion about next steps or incomplete configuration.

**Independent Test**: A newly registered server owner is automatically guided through a multi-step onboarding wizard (account confirmation → bot connection → pricing configuration) with progress indicators, "Next" navigation, and clear completion state.

**Acceptance Scenarios**:

1. **Given** a newly registered server owner, **When** they complete the signup flow, **Then** they are redirected to `/onboarding` to begin the guided setup
2. **Given** a server owner on the onboarding flow, **When** they view the onboarding page, **Then** they see a progress indicator showing 3 steps: "Account Confirmation", "Connect Bot", "Configure Pricing"
3. **Given** a server owner on the "Connect Bot" step, **When** they have successfully connected the bot, **Then** the "Next" button becomes enabled and clicking it advances to "Configure Pricing"
4. **Given** a server owner on the "Configure Pricing" step, **When** they have created at least one pricing tier, **Then** the "Complete Setup" button becomes enabled
5. **Given** a server owner who clicks "Complete Setup", **When** the onboarding flow finishes, **Then** they are redirected to `/dashboard` with a success message
6. **Given** a partially onboarded server owner (bot connected but no pricing tiers), **When** they log in, **Then** they are redirected to resume onboarding at the "Configure Pricing" step (`/onboarding/pricing`)
7. **Given** a server owner who has completed all onboarding steps, **When** they visit any `/onboarding/*` route, **Then** they are redirected to `/dashboard`

---

### User Story 4 - Settings Access (Priority: P2)

An authenticated server owner wants to modify their configuration after completing initial onboarding (e.g., reconnect bot, edit pricing tiers).

**Why this priority**: Returning users need ongoing access to modify their configuration. While less critical than initial setup, this is essential for product utility and user retention.

**Independent Test**: An authenticated server owner can navigate to `/settings/bot` to view bot connection status and reconnect if needed, and to `/settings/pricing` to create, edit, or delete pricing tiers.

**Acceptance Scenarios**:

1. **Given** an authenticated server owner, **When** they visit `/settings`, **Then** they are redirected to `/settings/bot` as the default settings tab
2. **Given** an authenticated server owner, **When** they visit `/settings/bot`, **Then** they see their Discord server connection status and options to reconnect or disconnect
3. **Given** an authenticated server owner, **When** they visit `/settings/pricing`, **Then** they see their configured pricing tiers and options to create, edit, or delete tiers
4. **Given** an authenticated server owner who has not connected a bot, **When** they visit `/settings/bot` or `/settings/pricing`, **Then** they are redirected to `/onboarding/bot` to complete setup first
5. **Given** an authenticated server owner, **When** they navigate from dashboard to settings, **Then** they can return to dashboard via a "Back to Dashboard" link or breadcrumb

---

### Edge Cases

- **Direct route access**: What happens when a visitor directly accesses `/dashboard` or `/settings/*` routes without being authenticated? → System redirects unauthenticated visitors to `/login` with a return URL parameter
- **Onboarding abandonment**: What happens when a user starts onboarding but doesn't complete it, then returns days later? → System detects incomplete state and redirects them to resume at the last incomplete step
- **Bot disconnected externally**: What happens when a server owner's bot is removed from their Discord server while they're logged in? → Dashboard shows "Disconnected" status with "Reconnect" button; settings bot page shows warning
- **Multiple tabs**: What happens when a user has multiple tabs open and completes onboarding in one tab? → Other tabs detect state change and redirect appropriately on next navigation
- **Browser back button**: What happens when a user clicks the browser back button during onboarding? → User returns to previous onboarding step; if at first step, back button behaves normally (may exit app)
- **Session expiry during onboarding**: What happens when a user's session expires while completing onboarding? → On next action, user is redirected to `/login` with return URL pointing to the incomplete onboarding step

---

## Requirements *(mandatory)*

### Functional Requirements

**Landing Page**
- **FR-001**: System MUST provide a public landing page at the root URL (`/`) that displays the product name, value proposition, and primary CTAs
- **FR-002**: Landing page MUST include a "Start Free Trial" button that redirects to `/signup`
- **FR-003**: Landing page MUST include a "Login" button that redirects to `/login`
- **FR-004**: System MUST redirect authenticated users visiting `/` to `/dashboard`
- **FR-005**: Landing page MUST load within 2 seconds on standard mobile or desktop connections

**Dashboard Route**
- **FR-006**: System MUST provide a dashboard route at `/dashboard` for authenticated server owners
- **FR-007**: Dashboard MUST display server connection status (Connected/Disconnected/Not configured)
- **FR-008**: Dashboard MUST provide quick action links to `/settings/bot` and `/settings/pricing`
- **FR-009**: System MUST redirect users to `/dashboard` upon successful login from `/login`
- **FR-010**: System MUST redirect users with incomplete onboarding to the appropriate onboarding step when visiting `/dashboard`

**Onboarding Flow**
- **FR-011**: System MUST provide an onboarding flow with 3 sequential steps: Account Confirmation (implicit via signup), Connect Bot (`/onboarding/bot`), Configure Pricing (`/onboarding/pricing`)
- **FR-012**: Onboarding pages MUST display a progress indicator showing all 3 steps and the current step
- **FR-013**: Onboarding pages MUST provide "Next" or "Complete Setup" navigation buttons that are disabled until the current step is completed
- **FR-014**: System MUST redirect newly registered users to `/onboarding` after signup completion
- **FR-015**: System MUST detect incomplete onboarding state and redirect users to resume at the appropriate step
- **FR-016**: System MUST redirect users who have completed onboarding to `/dashboard` when they visit any `/onboarding/*` route
- **FR-017**: System MUST mark onboarding as complete only after both bot connection and at least one pricing tier are configured
- **FR-018**: Onboarding completion MUST redirect users to `/dashboard` with a success confirmation

**Settings Routes**
- **FR-019**: System MUST provide a settings route at `/settings/bot` for viewing and managing Discord bot connection
- **FR-020**: System MUST provide a settings route at `/settings/pricing` for creating and managing pricing tiers
- **FR-021**: System MUST redirect `/settings` to `/settings/bot` as the default settings tab
- **FR-022**: System MUST redirect users to `/onboarding/bot` if they access settings routes before connecting their bot
- **FR-023**: Settings pages MUST include a "Back to Dashboard" link or breadcrumb for navigation

**Route Registration**
- **FR-024**: All routes MUST be registered in the application router configuration
- **FR-025**: System MUST handle 404 errors for undefined routes with a user-friendly message
- **FR-026**: Protected routes MUST redirect unauthenticated visitors to `/login` with a return URL parameter
- **FR-027**: System MUST honor return URL parameters after successful login by redirecting to the originally requested page

### Key Entities

- **OnboardingState**: Represents the progress of a server owner through the onboarding flow
  - `bot_connected`: Boolean indicating whether Discord bot has been successfully connected
  - `pricing_configured`: Boolean indicating whether at least one pricing tier has been created
  - `completed_at`: Timestamp when onboarding was marked complete (null if incomplete)
  - Relationships: belongs to one User (server owner)

- **User**: (existing entity from 001-server-owner-auth, extended)
  - `onboarding_state`: Reference to OnboardingState
  - Behavior: Users may have incomplete onboarding; dashboard access checks this state

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can locate and click "Start Free Trial" from the landing page within 5 seconds of page load (per Assumptions #5: "standard connections" = broadband >10 Mbps or mobile 4G/LTE)
- **SC-002**: 100% of new sign-ups are automatically redirected to onboarding flow after account creation
- **SC-003**: 90% of users who start onboarding complete all 3 steps (bot connection + pricing configuration) within their first session
- **SC-004**: Users can navigate from dashboard to any settings page and back within 3 clicks
- **SC-005**: Zero instances of users accessing protected routes without authentication (all properly redirect to login)
- **SC-006**: Users with incomplete onboarding are correctly redirected to resume at the appropriate step 100% of the time
- **SC-007**: All defined routes (`/`, `/dashboard`, `/settings`, `/settings/bot`, `/settings/pricing`, `/onboarding/*`) are accessible and return valid pages
- **SC-008**: Dashboard loads within 2 seconds for authenticated users on standard connections (per Assumptions #5: broadband >10 Mbps or mobile 4G/LTE)

---

## Assumptions

1. The authentication system (Feature 001) is functional and provides session management for determining authenticated vs. unauthenticated state
2. Discord bot connection (Feature 003) provides a way to determine whether a user has successfully connected their bot
3. Pricing tier configuration (Feature 004) provides a way to determine whether at least one pricing tier exists
4. The application uses a client-side router (TanStack Router based on existing codebase) for route management
5. "Standard connections" for performance targets refer to typical broadband (>10 Mbps) or mobile 4G/LTE connections
6. Server owners have only one Discord server to manage (MVP constraint from Feature 003)
7. The root route `/` should serve as both the landing page for anonymous users and the redirect trigger for authenticated users

---

## Dependencies

- **Feature 001 (Server Owner Auth)**: Authentication state management, session handling, login/signup flows
- **Feature 002 (Auth Refinement)**: Email verification flow (part of onboarding Account Confirmation step)
- **Feature 003 (Discord Bot Connection)**: Bot connection status determination, `/onboarding/bot` page, `/settings/bot` page
- **Feature 004 (Pricing Tier Configuration)**: Pricing tier existence check, `/onboarding/pricing` page, `/settings/pricing` page

---

## Out of Scope

For this feature, the following is explicitly out of scope:

- **Landing page content marketing**: Detailed product descriptions, feature tours, testimonials, or SEO optimization (minimal viable landing page only)
- **Dashboard analytics**: Revenue metrics, subscriber counts, or detailed statistics (focus on navigation and quick links)
- **Settings functionality beyond navigation**: Bot reconnection flow, pricing tier CRUD, role management (these are covered in Features 003 and 004)
- **Mobile responsive design optimization**: While pages should be functional on mobile, responsive breakpoints and mobile-specific layouts are not the focus
- **Navigation persistence**: Remembering the last visited page across sessions (default to dashboard for authenticated users)
- **Deep linking to specific onboarding steps**: Users always enter onboarding at the step determined by their progress state
