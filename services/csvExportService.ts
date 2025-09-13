import { AttendanceRecord, StudentInfo } from '../types';

export function exportAttendanceToCSV(
    attendance: AttendanceRecord[], 
    faceLinks: Map<number, string>,
    studentDirectory: Map<string, StudentInfo>
): void {
    const headers = ['Roll Number', 'Name', 'Department / Year', 'Date', 'Emotion', 'Status'];

    const rows = attendance.map(record => {
        const rollNumber = faceLinks.get(record.persistentId);
        if (!rollNumber) return null;

        const student = studentDirectory.get(rollNumber);
        if (!student) {
            return null; // Skip if student not found (e.g., deleted)
        }

        const date = new Date(record.timestamp);
        const dateString = date.toLocaleDateString();

        return [
            `"${student.rollNumber}"`,
            `"${student.name}"`,
            `"${student.department} / ${student.year}"`,
            `"${dateString}"`,
            `"${record.emotion}"`,
            `"Present"`
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