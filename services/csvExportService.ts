import { AttendanceRecord, StudentInfo, AdminInfo, Designation } from '../types';

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


const getWorkingDaysInMonth = (year: number, month: number): number => {
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const lastDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();
    
    let workingDays = 0;
    for (let day = 1; day <= lastDay; day++) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek > 0 && dayOfWeek < 6) { // Monday to Friday
            workingDays++;
        }
    }
    return workingDays;
};


export function exportMonthlySummaryToCSV(
    students: StudentInfo[],
    allAttendance: AttendanceRecord[],
    faceLinks: Map<number, string>
): void {
    const headers = ['Roll Number', 'Name', 'Department', 'Year', 'Month', 'Report Year', 'Present Days', 'Total Working Days', 'Percentage (%)'];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const studentIdMap = new Map<string, number>();
    faceLinks.forEach((roll, pid) => studentIdMap.set(roll, pid));

    const rows: string[] = [];

    students.forEach(student => {
        const persistentId = studentIdMap.get(student.rollNumber);
        if (persistentId === undefined) return;

        const studentAttendance = allAttendance.filter(rec => rec.persistentId === persistentId);
        if (studentAttendance.length === 0) return;

        const monthlyStats: { [key: string]: { present: Set<string>, year: number, month: number } } = {};

        studentAttendance.forEach(record => {
            const date = new Date(record.timestamp);
            const year = date.getFullYear();
            const month = date.getMonth();
            const key = `${year}-${month}`;
            if (!monthlyStats[key]) {
                monthlyStats[key] = { present: new Set(), year, month };
            }
            monthlyStats[key].present.add(date.toDateString());
        });

        Object.values(monthlyStats).forEach(stat => {
            const workingDays = getWorkingDaysInMonth(stat.year, stat.month);
            const presentDays = stat.present.size;
            const percentage = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(2) : 0;

            rows.push([
                `"${student.rollNumber}"`,
                `"${student.name}"`,
                `"${student.department}"`,
                `"${student.year}"`,
                `"${monthNames[stat.month]}"`,
                `"${stat.year}"`,
                `"${presentDays}"`,
                `"${workingDays}"`,
                `"${percentage}"`
            ].join(','));
        });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'monthly_attendance_summary.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function exportMidTermMarksReportToCSV(students: StudentInfo[]): void {
    const headers = ['Roll Number', 'Name', 'Department', 'Year', 'Section', 'Subject', 'Mid-1 Marks', 'Mid-2 Marks', 'Average'];
    const rows: string[] = [];

    students.forEach(student => {
        if (student.marks && student.marks.length > 0) {
            student.marks.forEach(mark => {
                let average: string | number = 'N/A';
                if (mark.mid1 !== null && mark.mid2 !== null) {
                    average = ((mark.mid1 + mark.mid2) / 2).toFixed(2);
                }
                rows.push([
                    `"${student.rollNumber}"`,
                    `"${student.name}"`,
                    `"${student.department}"`,
                    `"${student.year}"`,
                    `"${student.section}"`,
                    `"${mark.subject}"`,
                    `"${mark.mid1 ?? 'N/A'}"`,
                    `"${mark.mid2 ?? 'N/A'}"`,
                    `"${average}"`
                ].join(','));
            });
        } else {
             rows.push([
                `"${student.rollNumber}"`,
                `"${student.name}"`,
                `"${student.department}"`,
                `"${student.year}"`,
                `"${student.section}"`,
                `"N/A"`,
                `"N/A"`,
                `"N/A"`,
                `"N/A"`
            ].join(','));
        }
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'mid_term_marks_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


export function exportStudentDetailsReportToCSV(
    students: StudentInfo[],
    admins: AdminInfo[]
): void {
    const headers = ['Name', 'Roll Number', 'Section', 'Phone Number', 'Incharge Name'];

    const incharges = admins.filter(a => a.designation === Designation.Incharge);

    const rows = students.map(student => {
        // Find the incharge for this student's department and year.
        // First look for a section-specific incharge.
        let incharge = incharges.find(i => 
            i.department === student.department && 
            i.year === student.year &&
            i.section === student.section
        );
        // If not found, look for an "All Sections" incharge in the same department and year.
        if (!incharge) {
            incharge = incharges.find(i => 
                i.department === student.department &&
                i.year === student.year &&
                i.section === 'All Sections'
            );
        }

        const inchargeName = incharge ? incharge.name : 'N/A';

        return [
            `"${student.name}"`,
            `"${student.rollNumber}"`,
            `"${student.section}"`,
            `"${student.phoneNumber}"`,
            `"${inchargeName}"`
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'student_details_report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}