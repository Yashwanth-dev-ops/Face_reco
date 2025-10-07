# Krishna University Face Attendance - Developer Documentation

## 1. Project Overview

This document provides a comprehensive overview of the Krishna University Face Attendance system. It is a sophisticated, single-page web application designed to offer a modern, interactive, and AI-enhanced solution for university management.

### 1.1. Core Features

-   **Real-Time Face & Hand Detection:** Utilizes the device camera to continuously analyze video frames, detecting multiple faces and hand gestures simultaneously.
-   **AI-Powered Analysis:** Leverages the **Google Gemini API** for a wide range of tasks:
    -   **Vision:** Analyzing captured frames for identity, emotion, and hand signs.
    -   **Language:** Powering an AI Assistant, AI Tutor, Academic Advisor, and generating data-driven insights.
-   **Persistent Face Tracking:** Implements a custom IoU (Intersection over Union) tracking algorithm to assign a stable `persistentId` to each detected person.
-   **Role-Based Access Control (RBAC):** Features distinct dashboards and granular permissions for different user roles (Student, Teacher, Incharge, HOD, Principal, Chairman).
-   **Comprehensive User Management:** Admins can register users (individually or in bulk via CSV), manage profiles, and control account access with a nuanced blocking system (temporary/permanent).
-   **Full-Fledged Community Hub:**
    -   **Study Groups:** Students can create, join, and manage public or private (invite-only) study groups. Groups can be set as mixed-gender, boys-only, or girls-only to provide comfortable study environments.
    -   **Rich Group Chat:** Includes features like replies, file sharing, polls, audio messages, message deletion (for self/all), and message pinning by group admins.
    -   **Task Management:** Shared to-do lists within groups.
    -   **Notes Exchange:** A platform for students to upload and rate text-based study notes, with AI-powered summarization.
    -   **Resource Aggregation:** A central panel to view all files shared across all of a student's groups.
-   **Real-Time Notification System:**
    -   A centralized notification center (bell icon) for all users.
    -   Automated notifications for key events (group invites, direct messages, leave requests).
    -   A powerful admin broadcast system for targeted announcements (to all, or specific departments, years, or sections).
-   **Gamified Mark Prediction:** Students can predict their mid-term marks and claim rewards if their prediction is accurate, encouraging academic engagement.
-   **Academic & Staff Management:**
    -   **Timetable Management:** Admins can create and manage the university timetable.
    -   **Leave Management:** Staff can request leave; authorized admins can approve or reject requests, which automatically updates the timetable.
    -   **Holiday Management:** Admins can declare university-wide holidays, which automatically cancels classes and attempts to reschedule them using AI.
    -   **Staff Presence:** Staff can mark themselves as available or unavailable for the day.
-   **Data Reporting:** Admins can download various reports (daily attendance, monthly summaries, student details, marks) in CSV format.
-   **Simulated Backend & Email:** The application is self-contained. It uses `localStorage` as its database and features a mock inbox UI for simulated email-based account verification and notifications, creating a complete end-to-end user experience without a real backend.

### 1.2. Technology Stack

-   **Frontend Framework:** React 19 (using hooks)
-   **Language:** TypeScript
-   **AI/ML:** Google Gemini API (`@google/genai`) for all vision and language tasks.
-   **Styling:** Tailwind CSS for a utility-first design system.
-   **Bundling/Imports:** Uses modern browser features (`importmap`) to import modules directly without a build step.
-   **Persistence:** Browser `localStorage` serves as the application's database.

---

## 2. Project Architecture & Structure

The application is a client-side, single-page application (SPA) architected around a central `App.tsx` component that manages state, views, and data flow.

```
/
├── components/         # Reusable React components
├── services/           # Business logic, API calls, and data management
├── App.tsx             # Main application component, state management, view routing
├── index.html          # Entry point, CSS/JS setup, importmap
├── index.tsx           # React root rendering
├── types.ts            # Centralized TypeScript type definitions
└── DOCUMENTATION.md    # This file
```

### 2.1. Core Concepts

#### State and View Management (`App.tsx`)

-   **Single State Hub:** `App.tsx` acts as the single source of truth. It initializes and manages all major state variables, including the current `view`, `currentUser`, `studentDirectory`, `adminDirectory`, `attendance`, `conversations`, and `notifications`.
-   **View Enum:** The `View` type (`'LOGIN'`, `'ADMIN_DASHBOARD'`, etc.) controls which "screen" is rendered. The `renderContent` function in `App.tsx` is a large `switch` statement that renders the appropriate component based on the current `view` state.
-   **Data Flow:** Data is fetched from the `apiService` into the state of `App.tsx`. This data is then passed down as props to the relevant screen components. State mutations are handled by functions within `App.tsx` (e.g., `handleBlockStudent`) which call the `apiService` and then update the state with the returned data, triggering a re-render.

#### Real-time Analysis Loop (`App.tsx`)

The `captureAndAnalyze` function is the heart of the live attendance feature.
1.  **Frame Capture:** It grabs a frame from the `<video>` element and draws it to a hidden `<canvas>`.
2.  **Base64 Conversion:** The canvas content is converted to a Base64 encoded JPEG string.
3.  **API Call:** This string is sent to `geminiService.detectFacesAndHands`.
4.  **Face Tracking:** The results from Gemini are processed. The custom IoU tracking logic matches new detections to existing tracks to maintain a `persistentId`. This is crucial for linking a detected face to a student record over time.
5.  **Data Hydration:** If a `persistentId` is linked to a student (`faceLinks`), the `studentInfo` is attached to the face object.
6.  **Attendance Logging:** If a recognized student is visible and hasn't been logged in the last 5 minutes, `apiService.logAttendance` is called.
7.  **UI Update:** The final `detectionResult` state is updated, which causes `DetectionOverlay` and `DetectionSummary` to re-render with the new information.
8.  **Looping:** An interval (`ANALYSIS_INTERVAL`) calls this function repeatedly. It also includes logic to pause during API rate limits.

---

## 3. Services Deep Dive (`/services`)

The `services` directory abstracts all business logic and external interactions away from the UI components.

-   **`apiService.ts` (Mock Backend)**: This is the most critical service. It simulates a backend server by interacting directly with `storageService.ts` (`localStorage`).
    -   It handles all CRUD operations for students, admins, and all other data models (groups, notes, leaves, etc.).
    -   Manages authentication, registration, and password resets.
    -   Implements business logic for notifications, community features, permissions, and academic management.
    -   Defines custom error types like `BlockedLoginError` to pass specific information back to the UI.

-   **`geminiService.ts`**: The sole interface for the Google Gemini API.
    -   `detectFacesAndHands`: Main function for the analyzer, using a detailed prompt and JSON schema for structured vision data.
    -   `recognizeFace`: Used for the Face ID login feature.
    -   `askAI`: A versatile function that powers the AI Assistant, Tutor, and Advisor by accepting a prompt and an optional system instruction.
    -   `generateStudentPerformanceReport`, `suggestStudyTime`, `summarizeNoteContent`, `analyzeAttendanceAnomalies`: Specialized functions that provide context to Gemini for specific, high-level tasks.
    -   **Error Handling:** Includes specific checks for `RATE_LIMIT` and `NETWORK_ERROR` responses from the API.

-   **`storageService.ts`**: A simple abstraction over `localStorage`. It provides `load` and `save` functions for each major data type, handling JSON serialization and deserialization.

-   **`emailService.ts`**: Simulates an email system via a listener pattern. `App.tsx` listens for "sent" emails and displays them in the `MockInbox` component.

-   **`logService.ts`**: Provides functions for creating and retrieving an audit trail of administrator actions.

-   **`csvExportService.ts`**: Contains functions to generate and trigger the download of various reports.

---

## 4. Component Library (`/components`)

Components are organized by function, from full-page "screens" to smaller, reusable UI elements.

### 4.1. Screen Components

-   **Dashboards (`AdminDashboard`, `TeacherDashboard`, `StudentDashboard`):** The main landing pages for logged-in users, composed of smaller panel components.
-   **Authentication (`LoginScreen`, `StudentRegistrationScreen`, etc.):** Handle the entire auth flow.
-   **Onboarding/Verification (`OnboardingScreen`, `VerificationScreen`):** Guide new users through account setup.
-   **Specialty Screens (`BlockedScreen`, `HolidayManagementScreen`, `SettingsScreen`):** Provide dedicated UI for specific features.

### 4.2. Key UI Components

-   **`DetectionOverlay.tsx` & `DetectionSummary.tsx`**: The core UI for the live analyzer view.
-   **`NotificationBell.tsx` & `NotificationPanel.tsx`**: The complete UI for the notification center.
-   **`CommunityPanel.tsx`**: A tabbed container for all community features.
    -   **`StudyGroupsPanel.tsx`**: Manages the "My Groups" and "Find Groups" views.
    -   **`StudyGroupChatModal.tsx`**: A feature-rich modal for group interaction, including chat, tasks, and member management.
    -   **`NotesExchangePanel.tsx`**: Displays shared notes with rating and AI summary features.
    -   **`ResourcesPanel.tsx`**: Aggregates all downloadable files from a user's groups.
-   **`ChatMessage.tsx`**: Renders individual chat messages, handling complex content like polls, replies, files, and audio messages with a waveform player.
-   **`MarkPredictionPanel.tsx`**: The UI for the gamified mark prediction challenge.
-   **`AIAcademicAdvisorPanel.tsx` & `AITutorModal.tsx`**: Components that provide direct AI-powered assistance to students.
-   **Management Panels (`TimetableManagementPanel`, `LeaveManagementPanel`, `BulkRegistrationPanel`):** Complex UI components for administrators to manage university operations.
-   **Modals (`ConfirmationModal`, `BroadcastMessageModal`, `BlockStudentModal`, etc.):** A suite of modals for handling specific, focused user actions.
-   **`MockInbox.tsx`**: A floating button and modal that displays simulated emails, enabling a self-contained verification and notification workflow.

---

## 5. Key Data Structures (`types.ts`)

This file provides strong typing for all major data entities, acting as the schema for the application.

-   `StudentInfo` & `AdminInfo`: Define the shape of user objects, including properties for RBAC (`designation`), status (`blockExpiresAt`, `isPresentToday`), and identity (`gender`).
-   `Notification`: The structure for all user notifications, including targeted (`recipientId`) and global (`ALL`) alerts.
-   `StudyGroup`: A complex type defining a study group, containing arrays for `messages`, `tasks`, `resources`, `members`, and `pendingMembers`. Also includes a `genderRestriction` field to create single-gender groups as a security/comfort feature.
-   `GroupChatMessage`: Defines a chat message, with optional fields for `file`, `poll`, `audio`, and `replyToMessageId`.
-   `SharedNote`: The structure for a note in the Notes Exchange, including its `fileDataUrl` and an array of `ratings`.
-   `MarkPrediction`: Tracks a student's mark prediction, the AI's prediction, and whether a reward has been claimed.
-   `LeaveRecord` & `Holiday`: Structures for managing staff leave and university holidays.
-   `DetectionResult`, `FaceResult`, `HandResult`: Types that mirror the JSON schema expected from the `geminiService` vision API.

---

## 6. Getting Started

The project is designed to run directly in a modern browser without a build step.

### 6.1. Prerequisites

-   A modern web browser with support for `importmap` (Chrome, Edge, Firefox, Safari).
-   A webcam connected and accessible to the browser.

### 6.2. Configuration

**API Key:** The application requires a Google Gemini API key.
-   The key **must** be provided through an environment variable named `API_KEY`.
-   The application is hardcoded to look for `process.env.API_KEY`. There is no UI to enter the key. You must ensure this variable is available in the execution context where the app is served.

### 6.3. Running the Application

1.  Ensure the `API_KEY` environment variable is set.
2.  Serve the project directory using a simple local web server.
3.  Open the served URL in your browser. The application will start on the login screen. Demo accounts are automatically created on first run (e.g., `principal`/`admin`, `student`/`student`).