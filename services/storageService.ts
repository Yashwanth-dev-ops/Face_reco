
import { StudentInfo, AttendanceRecord } from '../types';

const STUDENTS_KEY = 'vision_ai_students';
const ATTENDANCE_KEY = 'vision_ai_attendance';

// --- Student Data ---

export function saveStudents(students: Map<number, StudentInfo>): void {
    try {
        const serialized = JSON.stringify(Array.from(students.entries()));
        localStorage.setItem(STUDENTS_KEY, serialized);
    } catch (error) {
        console.error("Failed to save students to localStorage:", error);
    }
}

export function loadStudents(): Map<number, StudentInfo> {
    try {
        const serialized = localStorage.getItem(STUDENTS_KEY);
        if (serialized) {
            const parsed = JSON.parse(serialized);
            return new Map(parsed);
        }
    } catch (error) {
        console.error("Failed to load students from localStorage:", error);
    }
    return new Map();
}

// --- Attendance Data ---

export function saveAttendance(attendance: AttendanceRecord[]): void {
    try {
        const serialized = JSON.stringify(attendance);
        localStorage.setItem(ATTENDANCE_KEY, serialized);
    } catch (error) {
        console.error("Failed to save attendance to localStorage:", error);
    }
}

export function loadAttendance(): AttendanceRecord[] {
    try {
        const serialized = localStorage.getItem(ATTENDANCE_KEY);
        if (serialized) {
            return JSON.parse(serialized);
        }
    } catch (error) {
        console.error("Failed to load attendance from localStorage:", error);
    }
    return [];
}
