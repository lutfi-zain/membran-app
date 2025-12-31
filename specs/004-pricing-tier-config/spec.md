# Feature Specification: Pricing Tier Configuration

**Feature Branch**: `004-pricing-tier-config`
**Created**: 2025-12-31
**Status**: Draft
**Input**: User description: "Pricing tier configuration (1-5 tiers) @prp.md"

---

## Overview

Server owners need the ability to configure 1-5 pricing tiers for their Discord server's premium membership offerings. Each tier defines a subscription price point, the Discord role granted upon subscription, and the features included. This configuration is essential for the monetization workflow described in the PRP.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Configure Pricing Tiers (Priority: P1)

As a server owner setting up membran.app for the first time, I need to define my available subscription tiers so that members can choose and purchase the access level that fits their needs.

**Why this priority**: Without pricing tiers, there is nothing to sell. This is the foundational configuration that enables the entire subscription business model. Server owners cannot accept payments or assign roles without defining what members are purchasing.

**Independent Test**: A server owner can complete the tier configuration wizard, see their configured tiers displayed on their public pricing page, and verify that each tier shows the correct price, name, and description. This delivers immediate value: the server is ready to accept subscriptions.

**Acceptance Scenarios**:

1. **Given** a server owner has completed bot connection, **When** they access the pricing tier configuration page, **Then** they see an empty state prompting them to create their first tier
2. **Given** a server owner is on the tier configuration page, **When** they fill in tier name, price, duration, and Discord role, **Then** the tier is saved and appears in their tier list
3. **Given** a server owner has configured 3 tiers, **When** they preview their public pricing page, **Then** all 3 tiers are displayed with correct information
4. **Given** a server owner is creating a tier, **When** they select a price value, **Then** the system formats it as currency (e.g., "$5.00") for display
5. **Given** a server owner has 5 tiers configured, **When** they attempt to add a 6th tier, **Then** the system prevents creation and displays a message explaining the 5-tier maximum

---

### User Story 2 - Edit and Delete Existing Tiers (Priority: P2)

As a server owner managing my monetization strategy, I need to modify pricing tier details (name, price, features) or remove tiers that are no longer relevant, so that my offerings stay aligned with my community's needs and market conditions.

**Why this priority**: Business needs evolve—server owners may need to adjust pricing, rename tiers, or retire underperforming options. While important, this can be done after initial setup; the business can operate with the initially configured tiers for some time.

**Independent Test**: A server owner can edit an existing tier's price from $10 to $15, delete an unused tier, and see these changes reflected on their public pricing page. Existing subscribers to modified tiers retain their access at the original terms.

**Acceptance Scenarios**:

1. **Given** a server owner has a tier named "Basic" priced at $5, **When** they edit the price to $7, **Then** the tier updates and new subscribers see the $7 price
2. **Given** a server owner edits a tier, **When** active subscribers exist for that tier, **Then** their subscription remains at the original price and terms (grandfathered)
3. **Given** a server owner wants to remove a tier, **When** they delete a tier with 0 active subscribers, **Then** the tier is removed and no longer appears on the pricing page
4. **Given** a server owner attempts to delete a tier, **When** that tier has active subscribers, **Then** the system warns them and requires confirmation before proceeding
5. **Given** a server owner confirms deletion of a tier with active subscribers, **Then** the tier is hidden from new subscribers but existing subscribers retain their role and access

---

### User Story 3 - Reorder Tier Display Sequence (Priority: P3)

As a server owner, I need to control the visual order of my pricing tiers on the public page (e.g., showing lowest-to-highest price, or highlighting a "recommended" tier in the center), so that I can influence purchase decisions and present my offerings strategically.

**Why this priority**: Display order affects conversion rates but does not prevent the core functionality. Server owners can launch with default ordering and optimize later based on member feedback and analytics.

**Independent Test**: A server owner can drag-and-drop tiers to rearrange them, and when viewing their public pricing page, the tiers appear in the new order. No functionality is broken—only visual presentation changes.

**Acceptance Scenarios**:

1. **Given** a server owner has 3 tiers (A, B, C), **When** they reorder them to C, A, B, **Then** the public pricing page displays them as C, A, B
2. **Given** a server owner reorders tiers, **When** they save the configuration, **Then** the new order is preserved across sessions
3. **Given** a server owner marks a tier as "featured" or "recommended", **When** the pricing page renders, **Then** that tier is visually highlighted and positioned centrally

---

### Edge Cases

- What happens when a server owner creates a tier with a price of $0? (System allows it as "free tier" for testing or trial access; counts toward the 5-tier maximum)
- What happens when a server owner selects a Discord role that the bot does not have permission to manage? (System validates bot permissions and shows error if role cannot be assigned)
- What happens when two tiers are configured with identical prices and names? (System allows it but warns about potential user confusion)
- How does the system handle tier deletion when the tier is the only one configured? (System prevents deletion, requiring at least 1 tier with `is_active = true` to remain)
- What happens when a server owner changes a tier's assigned Discord role? (Existing subscribers keep their old role until their subscription renews, or system provides option to bulk-update)
- What happens when pricing tier configuration is left incomplete during setup? (System prevents moving to next setup step until at least 1 tier is fully configured)
- What happens when the Discord role assigned to a tier is deleted from the server? (System detects during sync and marks tier as "needs attention" in dashboard)
- What happens when two server owners edit the same tier simultaneously? (System uses optimistic locking: last save wins, but warns if the tier was modified by another user since it was loaded)
- What happens when Discord API is down or rate-limited during tier configuration? (System allows saving with a warning, retries validation in background, and shows status when sync completes)
- What happens when a server owner enters a price above $999 or below $0? (System shows validation error and prevents saving until price is within $0-$999 range)
- What happens when a server owner tries to mark multiple tiers as "featured"? (System automatically un-features the previous tier when a new one is marked; at most one tier can be featured at a time)
- What happens when a server owner has no featured tier configured? (The first tier in display order is automatically treated as the default featured tier on the pricing page)
- What happens when a server owner tries to add more than 20 features to a tier? (System shows validation error and prevents adding the 21st feature; server owner must remove existing features first)

---

## Requirements *(mandatory)*

### Functional Requirements

**Tier Creation**
- **FR-001**: Server owners MUST be able to create 1-5 pricing tiers per server
- **FR-002**: Each tier MUST include a name (e.g., "Basic", "Premium", "VIP")
- **FR-003**: Each tier MUST include a price amount in the server's configured currency
- **FR-004**: Each tier MUST include a billing duration (monthly, yearly, or lifetime)
- **FR-005**: Each tier MUST be linked to exactly one Discord role from the server
- **FR-006**: Each tier MAY include a structured list of individual features (each feature has text description and display order; 0-20 features per tier)
- **FR-007**: System MUST validate that the bot has permission to manage the selected Discord role

**Tier Editing**
- **FR-008**: Server owners MUST be able to edit any attribute of an existing tier including name, price, duration, Discord role, and feature list
- **FR-009**: When a tier's price is changed, existing subscribers MUST retain their original price (grandfathering)
  - *Implementation*: The `subscriptions` table stores `price_paid_cents` at subscription creation time. This value never changes for the lifetime of the subscription.
- **FR-010**: When a tier's Discord role is changed, existing subscribers MUST retain their original role until subscription renewal
  - *Implementation*: The `subscriptions` table stores `discord_role_id` at subscription creation time. Role changes only affect new subscriptions; existing subscribers keep their assigned role until they cancel/renew.
- **FR-011**: System MUST warn when editing a tier that has active subscribers

**Tier Deletion**
- **FR-012**: Server owners MUST be able to delete tiers that have no active subscribers
- **FR-013**: System MUST require confirmation before deleting a tier with active subscribers
- **FR-014**: When a tier with active subscribers is deleted, it MUST be hidden from new subscribers but existing subscribers retain access
- **FR-015**: System MUST prevent deletion if it would result in zero configured tiers

**Tier Display and Ordering**
- **FR-016**: Server owners MUST be able to specify the display order of tiers on the public pricing page
- **FR-017**: At most one tier can be marked as "featured"; if no tier is explicitly featured, the first tier (by display order) is automatically the default
- **FR-018**: The public pricing page MUST display all tiers where `is_active = true` (soft-deleted tiers with `is_active = false` are hidden)

**Validation and Constraints**
- **FR-019**: System MUST enforce a maximum of 5 tiers per server (including $0 free tiers)
- **FR-020**: System MUST require at least 1 tier per server before the server can accept payments
- **FR-021**: System MUST validate that tier names are not empty
- **FR-022**: System MUST validate that prices are between $0 and $999 (inclusive)
- **FR-023**: System MUST validate that a Discord role is selected for each tier
- **FR-024**: System MUST prevent duplicate tier names (case-insensitive)
- **FR-025**: System MUST display a preview of how tiers will appear to potential subscribers

**Integration Points**
- **FR-026**: System MUST sync available Discord roles from the connected server
- **FR-027**: System MUST detect when a previously selected Discord role is no longer available
- **FR-028**: System MUST validate bot permissions for role management before allowing tier creation
- **FR-030**: When Discord API is unavailable or rate-limited, system MUST allow saving tier configuration with a warning and retry validation in the background

**Concurrency**
- **FR-029**: System MUST use optimistic locking when multiple users edit tiers simultaneously (detect version conflicts and warn if tier was modified by another user)

### Key Entities

- **PricingTier**: Represents a subscription tier that members can purchase
  - Attributes: name (text), price (decimal), currency (text), duration (enumeration: monthly/yearly/lifetime), description (optional text), displayOrder (integer), isFeatured (boolean), isActive (boolean)
  - Relationships: belongs to one DiscordServer, linked to one DiscordRole, has many Subscriptions

- **DiscordRole**: Represents a role from the Discord server that can be assigned to subscribers
  - Attributes: discordRoleId (text), roleName (text), botCanManage (boolean)
  - Relationships: linked to one or more PricingTiers, belongs to one DiscordServer

- **TierFeature**: Represents an individual feature/benefit listed for a tier
  - Attributes: description (text, max 200 chars), displayOrder (integer)
  - Constraints: 0-20 features per tier
  - Relationships: belongs to one PricingTier

- **Subscription**: Represents a member's active subscription to a tier
  - Attributes: status (enumeration), startDate (date), expiryDate (date), pricePaid (decimal)
  - Relationships: belongs to one Member, belongs to one PricingTier

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Server owners can complete initial tier configuration (1-3 tiers) in under 5 minutes
  - *Measurement*: Timer starts when user lands on `/onboarding/pricing` with Discord bot connected; ends when `POST /api/pricing/tiers` returns 201 for the first tier
- **SC-002**: Server owners can modify an existing tier's details in under 30 seconds
  - *Measurement*: Timer starts when user clicks "Edit" on a tier card; ends when `PUT /api/pricing/tiers/:tierId` returns 200
- **SC-003**: Changes to tier configuration are reflected on the public pricing page within 10 seconds
- **SC-004**: 95% of server owners successfully configure at least 1 tier on first attempt without errors
- **SC-005**: Server owners can correctly identify which Discord role corresponds to each tier 100% of the time (no ambiguity)
- **SC-006**: Zero instances of subscribers losing access when server owners edit tier configurations
- **SC-007**: System prevents invalid configurations (empty names, negative prices, missing roles) 100% of the time
- **SC-008**: Server owners can preview their pricing page configuration before publishing

---

## Assumptions

1. Server owners have already connected their Discord server and invited the bot before configuring pricing tiers (this is covered in feature 003-discord-bot-connection)
2. Discord bot has been granted the "Manage Roles" permission in the target server
3. Server owners understand basic subscription concepts (monthly vs. yearly billing)
4. Default currency is USD unless otherwise configured by server owner
5. Discord role IDs are unique and persistent within a server
6. Server owners have access to their Discord server's role list through the membran.app interface
7. The public pricing page URL follows a predictable format: `membran.app/server/{server-slug}`
8. Tier features/descriptions are for display purposes only and not enforced by the system

---

## Clarifications

### Session 2025-12-31

- Q: How should the system handle concurrent edits when multiple server owners modify pricing tiers simultaneously? → A: Optimistic locking with conflict detection (last write wins with warning if tier was modified)
- Q: How should the system handle Discord API failures when syncing roles or validating permissions? → A: Graceful degradation with retry (allow saving tiers, show warning, background sync)
- Q: What are the minimum and maximum allowed price values for a tier? → A: $0 minimum (allow free tiers), $999 maximum (reasonable cap to prevent errors/fraud)
- Q: How should the "featured" tier functionality work—can multiple tiers be featured, and what is the default? → A: At most one tier can be featured; if no tier is marked featured, the first tier (by display order) is automatically selected as default
- Q: How should tier features/descriptions be modeled—single text field or structured feature list? → A: Structured feature list with separate TierFeature entity (each feature is an individual item with text description and display order)

---

## Open Questions / Risks

1. **Currency multi-language support**: PRP indicates English-only for MVP, but currency symbols vary by region. Assume USD with "$" symbol for MVP.
2. **Tier limits and plan enforcement**: The PRP mentions the Base plan ($10/month) supports 500 members. Should tier configuration be limited by the server owner's subscription plan? Assume no—tier limits (1-5) are universal; member limits are enforced elsewhere.
3. ~~**Feature lists formatting**: Should tier descriptions support rich text (markdown, HTML) or plain text only?~~ **RESOLVED**: Structured feature list with individual TierFeature entities (0-20 features per tier, max 200 chars each).

---

## Out of Scope

For this MVP feature, the following is explicitly out of scope:

- **Free trial management**: Configuring 7-day free trials for new subscribers (Level 3 feature)
- **Discount/coupon codes**: Creating promotional codes for tier pricing (Level 3 feature)
- **Usage-based pricing**: Tier pricing based on activity or consumption (not in PRP)
- **Tier analytics**: Per-tier conversion rates, revenue breakdown, churn analysis (Level 2 feature)
- **Bulk tier management**: Copying tiers between servers or importing tier templates (future enhancement)
- **Custom tier URLs**: Unique landing pages for each tier (not in PRP)
- **Role upgrade/downgrade paths**: Automated flows when subscribers switch between tiers (future consideration)
