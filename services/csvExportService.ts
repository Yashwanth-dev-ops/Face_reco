
import { AttendanceRecord, StudentInfo } from '../types';

export function exportAttendanceToCSV(attendance: AttendanceRecord[], students: Map<number, StudentInfo>): void {
    const headers = ['Roll Number', 'Name', 'Date', 'Time', 'Emotion'];

    const rows = attendance.map(record => {
        const student = students.get(record.persistentId);
        if (!student) {
            return null; // Skip if student not found (e.g., unregistered)
        }

        const date = new Date(record.timestamp);
        const dateString = date.toLocaleDateString();
        const timeString = date.toLocaleTimeString();

        return [
            `"${student.rollNumber}"`,
            `"${student.name}"`,
            `"${dateString}"`,
            `"${timeString}"`,
            `"${record.emotion}"`
        ].join(',');
    }).filter(row => row !== null);

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'attendance_log.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
