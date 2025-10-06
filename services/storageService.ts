import { StudentInfo, AdminInfo, AttendanceRecord, VerificationToken, PasswordResetToken, TimeTableEntry, LeaveRecord, Conversation, Holiday, StudyGroup, SharedNote, Notification, UserPreferences } from '../types';
import { LogEntry } from './logService';

const STUDENT_DIRECTORY_KEY = 'vision_ai_student_directory';
const ADMIN_DIRECTORY_KEY = 'vision_ai_admin_directory';
const FACE_LINKS_KEY = 'vision_ai_face_links';
const ATTENDANCE_KEY = 'vision_ai_attendance';
const DEPARTMENTS_KEY = 'vision_ai_departments';
const ACTION_LOGS_KEY = 'vision_ai_action_logs';
const VERIFICATION_TOKENS_KEY = 'vision_ai_verification_tokens';
const PASSWORD_RESET_TOKENS_KEY = 'vision_ai_password_reset_tokens';
const TIMETABLE_KEY = 'vision_ai_timetable';
const LEAVE_RECORDS_KEY = 'vision_ai_leave_records';
const CONVERSATIONS_KEY = 'vision_ai_conversations';
const HOLIDAYS_KEY = 'vision_ai_holidays';
const STUDY_GROUPS_KEY = 'vision_ai_study_groups';
const SHARED_NOTES_KEY = 'vision_ai_shared_notes';
const NOTIFICATIONS_KEY = 'vision_ai_notifications';
const USER_PREFERENCES_KEY = 'vision_ai_user_preferences';


// --- Custom JSON serialization for handling Infinity ---
const replacer = (key: string, value: any) => {
    if (value === Infinity) {
        return "Infinity";
    }
    return value;
};

const reviver = (key: string, value: any) => {
    if (value === "Infinity") {
        return Infinity;
    }
    return value;
};

// --- User Preferences ---
export function saveUserPreferences(preferences: UserPreferences): void {
    try {
        localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
        console.error("Failed to save user preferences:", error);
    }
}

export function loadUserPreferences(): Partial<UserPreferences> {
    try {
        const data = localStorage.getItem(USER_PREFERENCES_KEY);
        return data ? JSON.parse(data) : {};
    } catch (error) {
        console.error("Failed to load user preferences:", error);
        return {};
    }
}


// --- Notifications ---
export function saveNotifications(notifications: Notification[]): void {
    try {
        localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
    } catch (error) {
        console.error("Failed to save notifications:", error);
    }
}

export function loadNotifications(): Notification[] {
    try {
        const data = localStorage.getItem(NOTIFICATIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load notifications:", error);
        return [];
    }
}


// --- Shared Notes ---
export function saveSharedNotes(notes: SharedNote[]): void {
    try {
        localStorage.setItem(SHARED_NOTES_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error("Failed to save shared notes:", error);
    }
}

export function loadSharedNotes(): SharedNote[] {
    try {
        const data = localStorage.getItem(SHARED_NOTES_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load shared notes:", error);
        return [];
    }
}


// --- Study Groups ---
export function saveStudyGroups(groups: StudyGroup[]): void {
    try {
        localStorage.setItem(STUDY_GROUPS_KEY, JSON.stringify(groups));
    } catch (error) {
        console.error("Failed to save study groups:", error);
    }
}

export function loadStudyGroups(): StudyGroup[] {
    try {
        const data = localStorage.getItem(STUDY_GROUPS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load study groups:", error);
        return [];
    }
}


// --- Holidays ---
export function saveHolidays(holidays: Holiday[]): void {
    try {
        localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
    } catch (error) {
        console.error("Failed to save holidays:", error);
    }
}

export function loadHolidays(): Holiday[] {
    try {
        const data = localStorage.getItem(HOLIDAYS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load holidays:", error);
        return [];
    }
}


// --- Conversations ---
export function saveConversations(conversations: Conversation[]): void {
    try {
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
        console.error("Failed to save conversations:", error);
    }
}

export function loadConversations(): Conversation[] {
    try {
        const data = localStorage.getItem(CONVERSATIONS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load conversations:", error);
        return [];
    }
}


// --- Leave Records ---
export function saveLeaveRecords(records: LeaveRecord[]): void {
    try {
        localStorage.setItem(LEAVE_RECORDS_KEY, JSON.stringify(records));
    } catch (error) {
        console.error("Failed to save leave records:", error);
    }
}

export function loadLeaveRecords(): LeaveRecord[] {
    try {
        const data = localStorage.getItem(LEAVE_RECORDS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load leave records:", error);
        return [];
    }
}


// --- Timetable ---
export function saveTimeTable(timetable: TimeTableEntry[]): void {
    try {
        localStorage.setItem(TIMETABLE_KEY, JSON.stringify(timetable));
    } catch (error) {
        console.error("Failed to save timetable:", error);
    }
}

export function loadTimeTable(): TimeTableEntry[] {
    try {
        const data = localStorage.getItem(TIMETABLE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load timetable:", error);
        return [];
    }
}

// --- Password Reset Tokens ---
export function savePasswordResetTokens(tokens: PasswordResetToken[]): void {
    try {
        localStorage.setItem(PASSWORD_RESET_TOKENS_KEY, JSON.stringify(tokens));
    } catch (error) {
        console.error("Failed to save password reset tokens:", error);
    }
}

export function loadPasswordResetTokens(): PasswordResetToken[] {
    try {
        const data = localStorage.getItem(PASSWORD_RESET_TOKENS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load password reset tokens:", error);
        return [];
    }
}


// --- Verification Tokens ---
export function saveVerificationTokens(tokens: VerificationToken[]): void {
    try {
        localStorage.setItem(VERIFICATION_TOKENS_KEY, JSON.stringify(tokens));
    } catch (error) {
        console.error("Failed to save verification tokens:", error);
    }
}

export function loadVerificationTokens(): VerificationToken[] {
    try {
        const data = localStorage.getItem(VERIFICATION_TOKENS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load verification tokens:", error);
        return [];
    }
}


// --- Action Logs ---
export function saveActionLogs(logs: LogEntry[]): void {
    try {
        localStorage.setItem(ACTION_LOGS_KEY, JSON.stringify(logs));
    } catch (error) {
        console.error("Failed to save action logs:", error);
    }
}

export function loadActionLogs(): LogEntry[] {
    try {
        const data = localStorage.getItem(ACTION_LOGS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load action logs:", error);
        return [];
    }
}


// --- Student Directory ---

/**
 * Saves the entire student directory map to local storage.
 * This serializes all properties of each StudentInfo object, including photoBase64.
 * Uses a custom replacer to handle Infinity values for permanent blocks.
 * @param students The map of student data to save.
 */
export function saveStudentDirectory(students: Map<string, StudentInfo>): void {
    try {
        localStorage.setItem(STUDENT_DIRECTORY_KEY, JSON.stringify(Array.from(students.entries()), replacer));
    } catch (error) {
        console.error("Failed to save student directory:", error);
    }
}

/**
 * Loads the student directory from local storage.
 * This deserializes all stored properties for each StudentInfo object.
 * Uses a custom reviver to handle "Infinity" strings for permanent blocks.
 * @returns The map of student data.
 */
export function loadStudentDirectory(): Map<string, StudentInfo> {
    try {
        const data = localStorage.getItem(STUDENT_DIRECTORY_KEY);
        return data ? new Map(JSON.parse(data, reviver)) : new Map();
    } catch (error) {
        console.error("Failed to load student directory:", error);
        return new Map();
    }
}

// --- Admin Directory ---

/**
 * Saves the entire admin directory map to local storage.
 * This serializes all properties of each AdminInfo object, including photoBase64.
 * @param admins The map of admin data to save.
 */
export function saveAdminDirectory(admins: Map<string, AdminInfo>): void {
    try {
        localStorage.setItem(ADMIN_DIRECTORY_KEY, JSON.stringify(Array.from(admins.entries())));
    } catch (error) {
        console.error("Failed to save admin directory:", error);
    }
}

/**
 * Loads the admin directory from local storage.
 * This deserializes all stored properties for each AdminInfo object.
 * @returns The map of admin data.
 */
export function loadAdminDirectory(): Map<string, AdminInfo> {
    try {
        const data = localStorage.getItem(ADMIN_DIRECTORY_KEY);
        const admins: [string, AdminInfo][] = data ? JSON.parse(data) : [];
        const adminMap = new Map(admins);
        // Initialize isPresentToday for all admins if it's not set
        adminMap.forEach(admin => {
            if (admin.isPresentToday === undefined) {
                admin.isPresentToday = true;
            }
        });
        return adminMap;
    } catch (error) {
        console.error("Failed to load admin directory:", error);
        return new Map();
    }
}

// --- Face Links ---

export function saveFaceLinks(links: Map<number, string>): void {
    try {
        localStorage.setItem(FACE_LINKS_KEY, JSON.stringify(Array.from(links.entries())));
    } catch (error) {
        console.error("Failed to save face links:", error);
    }
}

export function loadFaceLinks(): Map<number, string> {
    try {
        const data = localStorage.getItem(FACE_LINKS_KEY);
        return data ? new Map(JSON.parse(data)) : new Map();
    } catch (error) {
        console.error("Failed to load face links:", error);
        return new Map();
    }
}


// --- Attendance Data ---

export function saveAttendance(attendance: AttendanceRecord[]): void {
    try {
        localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance));
    } catch (error) {
        console.error("Failed to save attendance:", error);
    }
}

export function loadAttendance(): AttendanceRecord[] {
    try {
        const data = localStorage.getItem(ATTENDANCE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Failed to load attendance:", error);
        return [];
    }
}


// --- Department Data ---

export function saveDepartments(departments: string[]): void {
    try {
        localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(departments));
    } catch (error) {
        console.error("Failed to save departments:", error);
    }
}

export function loadDepartments(): string[] {
    try {
        const data = localStorage.getItem(DEPARTMENTS_KEY);
        return data ? JSON.parse(data) : ['CSE', 'ECE', 'EEE', 'IT', 'Mechanical', 'Civil'];
    } catch (error) {
        console.error("Failed to load departments:", error);
        return ['CSE', 'ECE', 'EEE', 'IT', 'Mechanical', 'Civil'];
    }
}