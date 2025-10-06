import React, { useMemo } from 'react';
import { StudentInfo, TimeTableEntry, AdminInfo, Designation } from '../types';

interface TeacherAvailabilityPanelProps {
    student: StudentInfo;
    timeTable: TimeTableEntry[];
    adminDirectory: Map<string, AdminInfo>;
}

export const TeacherAvailabilityPanel: React.FC<TeacherAvailabilityPanelProps> = ({ student, timeTable, adminDirectory }) => {
    const relevantStaff = useMemo(() => {
        const staffIdsToShow = new Set<string>();

        // Get subjects for the current student from their timetable entries
        const studentSubjects = new Set<string>();
        timeTable.forEach(entry => {
            if (
                entry.department === student.department &&
                entry.year === student.year &&
                entry.section === student.section
            ) {
                studentSubjects.add(entry.subject);
            }
        });

        // Iterate through all admins to find relevant staff
        for (const admin of adminDirectory.values()) {
            // 1. Add key leadership (Chairman, Principal, VP)
            if (
                admin.designation === Designation.Chairman ||
                admin.designation === Designation.Principal ||
                admin.designation === Designation.VicePrincipal
            ) {
                staffIdsToShow.add(admin.idNumber);
            }

            // 2. Add all faculty from the student's department (including HOD)
            if (admin.department === student.department) {
                staffIdsToShow.add(admin.idNumber);
            }
        }

        // 3. Add any teacher who teaches one of the student's subjects
        timeTable.forEach(entry => {
            if (studentSubjects.has(entry.subject)) {
                staffIdsToShow.add(entry.teacherId);
            }
        });

        // Map IDs to full AdminInfo objects and sort them
        return Array.from(staffIdsToShow)
            .map(id => adminDirectory.get(id))
            .filter((staff): staff is AdminInfo => !!staff)
            .sort((a, b) => {
                // Sort leadership roles to the top, then alphabetically
                const roleOrder: Designation[] = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal, Designation.HOD];
                const aRoleIndex = roleOrder.indexOf(a.designation);
                const bRoleIndex = roleOrder.indexOf(b.designation);

                if (aRoleIndex !== -1 && bRoleIndex === -1) return -1; // a is leadership, b is not
                if (aRoleIndex === -1 && bRoleIndex !== -1) return 1;  // b is leadership, a is not
                if (aRoleIndex !== -1 && bRoleIndex !== -1) {
                     if (aRoleIndex !== bRoleIndex) return aRoleIndex - bRoleIndex; // both are leadership, sort by rank
                }
                
                // For all others, sort by name
                return a.name.localeCompare(b.name);
            });

    }, [student, timeTable, adminDirectory]);
    
    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Staff Presence</h2>
            {relevantStaff.length === 0 ? (
                <p className="text-center text-gray-500 p-8">No relevant staff information is available at this time.</p>
            ) : (
                <div className="max-h-[70vh] overflow-y-auto">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
                        {relevantStaff.map(staff => (
                            <li key={staff.idNumber} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{staff.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {staff.department} 
                                        <span className="text-gray-400 dark:text-gray-500"> ({staff.designation})</span>
                                    </p>
                                </div>
                                {staff.isPresentToday ?? true ? (
                                    <span className="px-3 py-1 text-xs font-bold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/50 rounded-full">Available</span>
                                ) : (
                                    <span className="px-3 py-1 text-xs font-bold text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/50 rounded-full">Unavailable</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};