# Personal Cloud System Manifest
**Architectural Blueprint & Evolutionary Log**
*Compiled by Senior Systems Architect*

This document serves as the ultimate source of truth for the Personal Cloud infrastructure. It details the implementation of core features, security protocols, and storage management strategies implemented during the system's evolution.

---

## 1. Unified Process Management (`run.bat`)
**Objective:** Eliminate manual orchestration overhead and prevent process orphans.
**Solution:** A master execution script designed for atomic restarts.
- **Process Orchestration:** Uses `taskkill` with window title filtering to clean up previous Backend and Frontend instances.
- **Dependency Management:** Automates the cold-start of MariaDB (XAMPP) via direct binary invocation, bypassing UI latency.
- **Verification:** Implements polling timeouts to ensure database availability before the Node.js process attaches.

## 2. Secure Authentication Layer
**Objective:** Transition from an open-access model to a multi-tenant secure architecture.
**Implementation Details:**
- **Cryptographic Hashing:** Integrated `bcryptjs` for non-reversible password storage (10-round salt).
- **Session Management:** Stateless JWT-based authentication using `jsonwebtoken`.
- **Identity Injection:** Custom middleware extracts the user identity and role directly from the `Authorization: Bearer <token>` header, injecting it into the request context (`req.user`).
- **Unified Auth UI:** Atomic React component (`Auth.jsx`) handling dual-state (Login/Register) with real-time validation.

## 3. Windows-Style Hierarchical File System
**Objective:** Mirror virtual cloud structure directly onto physical disk storage for high maintainability.
**Architectural Decisions:**
- **Dynamic Path Resolution:** Recursive lookup (`getFolderPathString`) converts database folder IDs into physical OS directory strings.
- **Two-Stage Upload:** Implemented `cloud/temp/` as a landing zone for Multer, followed by an immediate atomic `renameSync` to the final hierarchical destination.
- **Directory Synchronization:** Folder creation (`mkdirSync`) and renaming (`renameSync`) are performed synchronously with DB operations to prevent state drift.
- **Physical Segregation:** Automatic creation of `active/` and `trash/` subdirectories per user.

## 4. Physical Trash Mechanism
**Objective:** Provide a fail-safe deletion layer without duplicating data pointers.
**Process Flow:**
- **Logic:** Instead of a simple `is_deleted` flag, the system performs a physical move between the user's `active/` and `trash/` root folders.
- **Recursive Move:** When a folder is trashed, the system identifies all child nodes and relocates every associated file on the disk, updating the DB pointers in a single transaction sequence.

## 5. Peer-to-Peer Sharing Infrastructure
**Objective:** Enable collaborative access without data duplication (Single Source of Truth).
**Technical Stack:**
- **Permissions Matrix:** New `permissions` table mapping `user_id` to `file_id`/`folder_id` with specific access levels (`view`, `edit`).
- **Unionized Discovery:** The `/list` endpoint utilizes `UNION` queries to merge owned assets with shared assets into a unified view.
- **Authenticated Access:** Modified the authorization middleware to support `?token=` query parameters for <img> and <a> tags, bypassing the standard header limitations for binary media previews.

## 6. Real-Time Activity Ledger (`activity_log.json`)
**Objective:** Continuous auditing of system state changes.
**Mechanism:**
- **Persistence:** JSON-formatted audit trail stored within each user's root cloud directory.
- **Events Tracked:** `ACCOUNT_CREATED`, `UPLOAD`, `TRASH`, `RESTORE`, `PERMANENT_DELETE`, `DOCUMENT_CREATED`.
- **Formatting:** Human-readable indentation (4 spaces) ensuring clear administrative review.

## 7. Administrative Control Plane
**Objective:** High-level system oversight and user lifecycle management.
**Features:**
- **Role-Based Access Control (RBAC):** Implementation of the `isAdmin` middleware.
- **Administrative Dashboard:** Protected UI view for managing user accounts and global cleanup.
- **Account Termination:** Cascade deletion logic that clears both database records and physical disk footprints for deleted users.

## 8. User Profile Management (Settings)
**Objective:** Empower users with self-service profile updates.
**Solution:** A dedicated settings interface for identity and credential rotation.
- **Atomic Profile Updates:** Implemented `PUT /users/settings` which supports partial updates (username/email) and secure password rotation via `bcryptjs` re-salting.
- **Consolidated Account Actions:** Relocated the session termination (Logout) functionality into the settings interface to provide a unified user management experience and cleaner primary workspace.
- **Session Continuity:** Updates are synchronized with `localStorage` to maintain UI consistency without forced re-logins.
- **Audit Integration:** Profile changes are recorded in the `activity_log.json` under the `SETTINGS_UPDATED` event type.

---
*System Status: Stable. High architectural integrity maintained.*

## 9. Сесия-2 (5 март 2026)
**Objective:** UI/UX персонализация и профили.
- **Теми:** Реализирана пълна поддръжка на теми (Light/Dark) и 17 акцентни цвята чрез CSS променливи и Tailwind v4 @variant dark. Данните се пазят в \localStorage\.
- **Профили:** Добавена възможност за качване на профилна снимка (съхранявана в папката на потребителя) и въвеждане на Име/Фамилия (добавени \irst_name\, \last_name\, \profile_picture\ колони в базата данни).
- **UI Fixes:** Коригирани проблеми с прекалено ярки ховър ефекти в тъмната тема и счупени превюта в менюто за настройки.
