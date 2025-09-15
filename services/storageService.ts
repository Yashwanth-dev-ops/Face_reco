import { StudentInfo, AdminInfo, AttendanceRecord } from '../types';
import { LogEntry } from './logService';

const STUDENT_DIRECTORY_KEY = 'vision_ai_student_directory';
const ADMIN_DIRECTORY_KEY = 'vision_ai_admin_directory';
const FACE_LINKS_KEY = 'vision_ai_face_links';
const ATTENDANCE_KEY = 'vision_ai_attendance';
const DEPARTMENTS_KEY = 'vision_ai_departments';
const ACTION_LOGS_KEY = 'vision_ai_action_logs';


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
 * @param students The map of student data to save.
 */
export function saveStudentDirectory(students: Map<string, StudentInfo>): void {
    try {
        localStorage.setItem(STUDENT_DIRECTORY_KEY, JSON.stringify(Array.from(students.entries())));
    } catch (error) {
        console.error("Failed to save student directory:", error);
    }
}

/**
 * Loads the student directory from local storage.
 * This deserializes all stored properties for each StudentInfo object.
 * @returns The map of student data.
 */
export function loadStudentDirectory(): Map<string, StudentInfo> {
    try {
        const data = localStorage.getItem(STUDENT_DIRECTORY_KEY);
        return data ? new Map(JSON.parse(data)) : new Map();
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
        return data ? new Map(JSON.parse(data)) : new Map();
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