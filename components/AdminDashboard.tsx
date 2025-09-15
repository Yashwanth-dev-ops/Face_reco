import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AdminInfo, Designation, Year, AttendanceRecord } from '../types';
import { emotionUIConfig } from './uiConfig';
import { exportMonthlySummaryToCSV, exportStudentDetailsReportToCSV } from '../services/csvExportService';
import { MidTermAssessment } from './MidTermAssessment';
import { MarkUpdate } from '../services/apiService';
import { DownloadReportModal } from './DownloadReportModal';
import { LogPanel } from './LogPanel';

interface AdminDashboardProps {
    currentUser: AdminInfo;
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
    departments: string[];
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    onDeleteStudent: (rollNumber: string) => void;
    onToggleBlockStudent: (rollNumber: string) => void;
    onDeleteAdmin: (idNumber: string) => void;
    onToggleBlockAdmin: (idNumber: string) => void;
    onLogout: () => void;
    onDownload: (filteredAttendance: AttendanceRecord[]) => void;
    onUpdateMarks: (updates: MarkUpdate[]) => Promise<void>;
    onLogAction: (action: string, details: string) => void;
}

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
    </svg>
);

const BlockIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

// Icons for Action Cards
const DailyLogIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l2 2 4-4" />
    </svg>
);

const MonthlySummaryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);

const StudentDetailsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const ActionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    disabled: boolean;
    colorClass: { bg: string };
}> = ({ icon, title, description, onClick, disabled, colorClass }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`
            bg-slate-900/50 rounded-lg p-4 flex items-center gap-4 w-full text-left border border-slate-700/80 transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800/60 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500'}
        `}
    >
        <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${colorClass.bg}`}>
            {icon}
        </div>
        <div className="flex-grow">
            <h3 className="font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
        <div className="flex-shrink-0 text-gray-400 group-hover:text-white transition-colors">
            <DownloadIcon className="w-6 h-6" />
        </div>
    </button>
);


const StudentProfileModal: React.FC<{
    student: StudentInfo;
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    onClose: () => void;
}> = ({ student, attendance, faceLinks, onClose }) => {
    
    const studentPersistentId = useMemo(() => {
        for (const [pid, roll] of faceLinks.entries()) {
            if (roll === student.rollNumber) return pid;
        }
        return null;
    }, [faceLinks, student.rollNumber]);

    const studentAttendance = useMemo(() => {
        if (studentPersistentId === null) return [];
        return attendance
            .filter(record => record.persistentId === studentPersistentId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [attendance, studentPersistentId]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-2xl m-4 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between pb-4 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        {student.photoBase64 ? (
                            <img src={student.photoBase64} alt={student.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-600" />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-indigo-300 font-bold text-3xl">
                                {student.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-3xl font-bold text-white">{student.name}</h2>
                            <p className="text-lg text-gray-400">{student.rollNumber}</p>
                            <p className="text-md text-indigo-300 mt-1">{student.department} - {student.year} - Sec {student.section}</p>
                        </div>
                    </div>
                     <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-full text-gray-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                <div className="mt-6 flex-grow overflow-y-auto pr-2">
                     <h3 className="text-xl font-bold text-gray-200 mb-3">Attendance Log ({studentAttendance.length})</h3>
                     <div className="bg-slate-900/50 rounded-lg">
                        {studentAttendance.length === 0 ? (
                            <p className="text-center text-gray-500 p-8">No attendance records found for this student.</p>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-slate-900/80 backdrop-blur-sm">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Date</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Time</th>
                                        <th className="p-3 text-sm font-semibold text-gray-400">Emotion</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {studentAttendance.map(record => {
                                        const date = new Date(record.timestamp);
                                        return (
                                            <tr key={record.timestamp} className="hover:bg-slate-800/60">
                                                <td className="p-3 text-sm text-gray-300">{date.toLocaleDateString()}</td>
                                                <td className="p-3 text-sm text-gray-300">{date.toLocaleTimeString()}</td>
                                                <td className="p-3 text-sm text-gray-300 flex items-center gap-2">
                                                    <span>{emotionUIConfig[record.emotion].emoji}</span>
                                                    <span>{record.emotion}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                     </div>
                </div>

                <footer className="mt-6 pt-4 border-t border-slate-700 text-right">
                    {student.isBlocked && <p className="text-sm font-bold text-red-400 float-left pt-2">This account is currently BLOCKED.</p>}
                     <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                </footer>
            </div>
        </div>
    );
};

const StudentManagementPanel: React.FC<Omit<AdminDashboardProps, 'onDeleteAdmin' | 'onToggleBlockAdmin' | 'onUpdateMarks'>> = (props) => {
    const { currentUser, studentDirectory, adminDirectory, departments, attendance, faceLinks, onDeleteStudent, onToggleBlockStudent, onDownload, onLogAction } = props;
    const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('ALL');
    const [sectionFilter, setSectionFilter] = useState<string>('ALL');
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [reportTypeToDownload, setReportTypeToDownload] = useState<'daily' | 'monthly' | 'details' | null>(null);

    const hasFullControl = currentUser.designation === Designation.Principal || currentUser.designation === Designation.VicePrincipal || currentUser.designation === Designation.HOD;
    const canDelete = currentUser.designation !== Designation.Incharge;

     useEffect(() => {
        if (currentUser.designation === Designation.HOD || currentUser.designation === Designation.Incharge) {
            setDepartmentFilter(currentUser.department);
        }
        if (currentUser.designation === Designation.Incharge) {
            setYearFilter(currentUser.year || Year.First);
            if (currentUser.section && currentUser.section !== 'All Sections') {
                setSectionFilter(currentUser.section);
            }
        }
    }, [currentUser]);


    const filteredStudents = useMemo(() => {
        return Array.from(studentDirectory.values()).filter(student => {
            const departmentMatch = departmentFilter === 'ALL' || student.department === departmentFilter;
            const yearMatch = yearFilter === 'ALL' || student.year === yearFilter;
            const sectionMatch = sectionFilter === 'ALL' || student.section === sectionFilter;
            return departmentMatch && yearMatch && sectionMatch;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [studentDirectory, departmentFilter, yearFilter, sectionFilter]);

    const createDownloadLogDetails = (reportTitle: string, students: StudentInfo[], filters: {dept: string, year: string, sec: string}) => {
        const studentCount = students.length;
        let logDetails = `${reportTitle} for ${studentCount} student(s) with filters (Dept: ${filters.dept}, Year: ${filters.year}, Sec: ${filters.sec}).`;

        if (studentCount > 0 && studentCount <= 10) {
            const rollNumbers = students.map(s => s.rollNumber).join(', ');
            logDetails += ` Roll Numbers: ${rollNumbers}`;
        }
        return logDetails;
    };

    const downloadDailyLogForFiltered = () => {
        const logDetails = createDownloadLogDetails('Daily Attendance Log', filteredStudents, {dept: departmentFilter, year: yearFilter, sec: sectionFilter});
        onLogAction('Download Report', logDetails);
        const filteredRollNumbers = new Set(filteredStudents.map(s => s.rollNumber));
        const persistentIdsForReport = new Set<number>();
        faceLinks.forEach((roll, pid) => {
            if (filteredRollNumbers.has(roll)) {
                persistentIdsForReport.add(pid);
            }
        });
        const filteredAttendance = attendance.filter(record => persistentIdsForReport.has(record.persistentId));
        onDownload(filteredAttendance);
    };
    const downloadMonthlySummaryForFiltered = () => {
        const logDetails = createDownloadLogDetails('Monthly Summary', filteredStudents, {dept: departmentFilter, year: yearFilter, sec: sectionFilter});
        onLogAction('Download Report', logDetails);
        exportMonthlySummaryToCSV(filteredStudents, attendance, faceLinks);
    };
    const downloadStudentDetailsForFiltered = () => {
        const logDetails = createDownloadLogDetails('Student Details Report', filteredStudents, {dept: departmentFilter, year: yearFilter, sec: sectionFilter});
        onLogAction('Download Report', logDetails);
        exportStudentDetailsReportToCSV(filteredStudents, Array.from(adminDirectory.values()));
    };


    const handleDownloadRequest = (type: 'daily' | 'monthly' | 'details') => {
        const isPrivilegedUser = [Designation.Principal, Designation.VicePrincipal].includes(currentUser.designation);
        const isHODorInchargeAll = [Designation.HOD].includes(currentUser.designation) || 
                               (currentUser.designation === Designation.Incharge && (!currentUser.section || currentUser.section === 'All Sections'));


        if (isPrivilegedUser || isHODorInchargeAll) {
            setReportTypeToDownload(type);
            setIsDownloadModalOpen(true);
        } else {
            // Incharge for a specific section, download directly
            if (type === 'daily') downloadDailyLogForFiltered();
            else if (type === 'monthly') downloadMonthlySummaryForFiltered();
            else if (type === 'details') downloadStudentDetailsForFiltered();
        }
    };
    
    const getReportTitle = () => {
        switch(reportTypeToDownload) {
            case 'daily': return 'Daily Attendance Log';
            case 'monthly': return 'Monthly Summary';
            case 'details': return 'Student Details Report';
            default: return 'Report';
        }
    };

    const handleModalDownloadSubmit = (selectedDepartment: string, selectedYear: Year, selectedSection: string) => {
        const studentsForReport = Array.from(studentDirectory.values()).filter(student => {
            const departmentMatch = selectedDepartment === 'ALL' || student.department === selectedDepartment;
            const yearMatch = student.year === selectedYear;
            const sectionMatch = selectedSection === 'ALL' || student.section === selectedSection;
            return departmentMatch && yearMatch && sectionMatch;
        });
        
        if (reportTypeToDownload) {
            const reportTitle = getReportTitle();
            const logDetails = createDownloadLogDetails(reportTitle, studentsForReport, {dept: selectedDepartment, year: selectedYear, sec: selectedSection});
            onLogAction('Download Report', logDetails);
        }

        if (reportTypeToDownload === 'daily') {
            const rollNumbers = new Set(studentsForReport.map(s => s.rollNumber));
            const pids = new Set<number>();
            faceLinks.forEach((roll, pid) => { if (rollNumbers.has(roll)) pids.add(pid); });
            const attendanceForReport = attendance.filter(rec => pids.has(rec.persistentId));
            onDownload(attendanceForReport);
        } else if (reportTypeToDownload === 'monthly') {
            exportMonthlySummaryToCSV(studentsForReport, attendance, faceLinks);
        } else if (reportTypeToDownload === 'details') {
            exportStudentDetailsReportToCSV(studentsForReport, Array.from(adminDirectory.values()));
        }

        setIsDownloadModalOpen(false);
        setReportTypeToDownload(null);
    };

    const handleViewStudent = (student: StudentInfo) => {
        onLogAction('View Student Profile', `Viewed profile for student: ${student.name} (Roll Number: ${student.rollNumber})`);
        setSelectedStudent(student);
    };


    return (
        <>
            {selectedStudent && (
                <StudentProfileModal
                    student={selectedStudent}
                    attendance={attendance}
                    faceLinks={faceLinks}
                    onClose={() => setSelectedStudent(null)}
                />
            )}
            {isDownloadModalOpen && (
                <DownloadReportModal
                    onClose={() => setIsDownloadModalOpen(false)}
                    onSubmit={handleModalDownloadSubmit}
                    title={getReportTitle()}
                    departments={departments}
                    currentUser={currentUser}
                />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-300 mb-4">Actions</h2>
                         <div className="space-y-3">
                            <ActionCard
                                icon={<DailyLogIcon className="w-6 h-6 text-cyan-200" />}
                                title="Daily Log"
                                description="Download day-by-day attendance."
                                onClick={() => handleDownloadRequest('daily')}
                                disabled={studentDirectory.size === 0}
                                colorClass={{ bg: 'bg-cyan-500/20' }}
                            />
                            <ActionCard
                                icon={<MonthlySummaryIcon className="w-6 h-6 text-purple-200" />}
                                title="Monthly Summary"
                                description="Download monthly percentages."
                                onClick={() => handleDownloadRequest('monthly')}
                                disabled={studentDirectory.size === 0}
                                colorClass={{ bg: 'bg-purple-500/20' }}
                            />
                            <ActionCard
                                icon={<StudentDetailsIcon className="w-6 h-6 text-blue-200" />}
                                title="Student Details"
                                description="Download student contact info."
                                onClick={() => handleDownloadRequest('details')}
                                disabled={studentDirectory.size === 0}
                                colorClass={{ bg: 'bg-blue-500/20' }}
                            />
                        </div>
                    </div>
                     <div>
                        <h2 className="text-2xl font-bold text-indigo-300 mb-4">Student Controls</h2>
                        <div className="bg-slate-900/50 p-4 rounded-lg text-gray-400 text-sm space-y-2">
                            <p><span className="font-bold text-gray-300">View Profile:</span> Click on any student row to view their detailed profile and attendance history.</p>
                            <p><span className="font-bold text-gray-300">Block/Unblock:</span> Use the <BlockIcon className="w-4 h-4 inline-block mx-1"/> icon to toggle their access.</p>
                            <p><span className="font-bold text-gray-300">Delete:</span> Use the <TrashIcon className="w-4 h-4 inline-block mx-1"/> icon to permanently remove a student.</p>
                            <p className="text-xs text-gray-500 pt-2 border-t border-slate-700/50">Note: Deleting a student also removes their attendance history.</p>
                        </div>
                    </div>
                </div>
                
                <div className="lg:col-span-2">
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-indigo-300">Registered Students ({filteredStudents.length})</h2>
                        <div className="flex gap-2">
                            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} disabled={currentUser.designation !== Designation.Principal && currentUser.designation !== Designation.VicePrincipal} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:cursor-not-allowed disabled:bg-slate-800">
                                {currentUser.designation !== Designation.HOD && currentUser.designation !== Designation.Incharge && <option value="ALL">All Departments</option>}
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} disabled={currentUser.designation === Designation.Incharge} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:cursor-not-allowed disabled:bg-slate-800">
                                {currentUser.designation !== Designation.Incharge && <option value="ALL">All Years</option>}
                                {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)} disabled={currentUser.designation === Designation.Incharge && currentUser.section !== 'All Sections'} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition disabled:cursor-not-allowed disabled:bg-slate-800">
                                <option value="ALL">All Sections</option>
                                <option value="1">Section 1</option>
                                <option value="2">Section 2</option>
                                <option value="3">Section 3</option>
                                <option value="4">Section 4</option>
                            </select>
                        </div>
                    </div>
                     <div className="bg-slate-900/50 rounded-lg max-h-[60vh] overflow-y-auto">
                        {filteredStudents.length === 0 ? (
                            <p className="text-center text-gray-500 p-8">
                                No students found
                                {(currentUser.designation === Designation.HOD || currentUser.designation === Designation.Incharge) && ` in the ${currentUser.department} department`}
                                {' '}matching your filters.
                            </p>
                        ) : (
                            <div className="divide-y divide-slate-800">
                            {filteredStudents.map(student => (
                                <div key={student.rollNumber} className={`p-4 flex justify-between items-center ${student.isBlocked ? 'opacity-50' : 'hover:bg-slate-800/60 transition-colors cursor-pointer'}`}>
                                    <div className="flex items-center gap-4 flex-grow" onClick={() => !student.isBlocked && handleViewStudent(student)}>
                                        {student.photoBase64 ? (
                                            <img src={student.photoBase64} alt={student.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-600" />
                                        ) : (
                                             <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-indigo-300 font-bold text-lg">
                                                {student.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-bold text-white">{student.name} {student.isBlocked && <span className="text-xs font-bold text-red-400">(Blocked)</span>}</p>
                                            <p className="text-sm text-gray-400">{student.rollNumber}</p>
                                            <p className="text-xs text-indigo-300 bg-indigo-900/50 inline-block px-2 py-0.5 rounded mt-1">{student.department} - {student.year} - Sec {student.section}</p>
                                        </div>
                                    </div>
                                    {hasFullControl && (
                                        <div className="flex gap-2">
                                            <button onClick={() => onToggleBlockStudent(student.rollNumber)} className="p-2 rounded-full text-gray-400 hover:text-yellow-400 hover:bg-slate-700 transition-colors" title={student.isBlocked ? 'Unblock Student' : 'Block Student'}><BlockIcon className="w-5 h-5"/></button>
                                            {canDelete && <button onClick={() => onDeleteStudent(student.rollNumber)} className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-slate-700 transition-colors" title="Delete Student"><TrashIcon className="w-5 h-5"/></button>}
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

const StaffManagementPanel: React.FC<Pick<AdminDashboardProps, 'currentUser' | 'adminDirectory' | 'onDeleteAdmin' | 'onToggleBlockAdmin'>> = ({ currentUser, adminDirectory, onDeleteAdmin, onToggleBlockAdmin }) => {
     const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

    const filteredAdmins = useMemo(() => {
        return Array.from(adminDirectory.values()).filter(admin => {
            const departmentMatch = departmentFilter === 'ALL' || admin.department === departmentFilter;
            // Principal/VP should not be filterable by department
            if (admin.designation === Designation.Principal || admin.designation === Designation.VicePrincipal) {
                return true;
            }
            return departmentMatch;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [adminDirectory, departmentFilter]);
    
    return (
        <div className="bg-slate-900/50 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-indigo-300">Staff Management ({filteredAdmins.length})</h2>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
                 {filteredAdmins.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">No staff members found.</p>
                ) : (
                    <div className="divide-y divide-slate-800">
                    {filteredAdmins.map(admin => (
                        <div key={admin.idNumber} className={`p-4 flex justify-between items-center ${admin.isBlocked ? 'opacity-50' : 'hover:bg-slate-800/60 transition-colors'}`}>
                            <div className="flex items-center gap-4">
                                {admin.photoBase64 ? (
                                    <img src={admin.photoBase64} alt={admin.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-600" />
                                ) : (
                                     <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-indigo-300 font-bold text-lg">
                                        {admin.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-white">{admin.name} {admin.isBlocked && <span className="text-xs font-bold text-red-400">(Blocked)</span>}</p>
                                    <p className="text-sm text-gray-400">{admin.idNumber}</p>
                                    <p className="text-xs text-indigo-300 bg-indigo-900/50 inline-block px-2 py-0.5 rounded mt-1">
                                        {admin.designation} - {admin.department}
                                        {admin.designation === Designation.Incharge && admin.year && ` - ${admin.year.replace(' Year', '')} Year`}
                                        {admin.designation === Designation.Incharge && admin.section && ` - Sec: ${admin.section}`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onToggleBlockAdmin(admin.idNumber)}
                                    disabled={admin.idNumber === currentUser.idNumber || admin.designation === Designation.Principal}
                                    className="p-2 rounded-full text-gray-400 hover:text-yellow-400 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={admin.isBlocked ? 'Unblock Admin' : 'Block Admin'}
                                >
                                    <BlockIcon className="w-5 h-5"/>
                                </button>
                                <button
                                    onClick={() => onDeleteAdmin(admin.idNumber)}
                                    disabled={admin.idNumber === currentUser.idNumber || admin.designation === Designation.Principal}
                                    className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete Admin"
                                >
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
    const { currentUser, onLogout } = props;
    const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'marks' | 'logs'>('students');

    const canManageStaff = currentUser.designation === Designation.Principal || currentUser.designation === Designation.VicePrincipal;
    const canManageMarks = [Designation.Principal, Designation.VicePrincipal, Designation.HOD, Designation.Incharge].includes(currentUser.designation);
    const canViewLogs = [Designation.Principal, Designation.VicePrincipal, Designation.HOD].includes(currentUser.designation);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-fade-in">
             <header className="mb-6 w-full flex justify-between items-center">
                <div className="flex items-center gap-4">
                     {currentUser.photoBase64 ? (
                        <img src={currentUser.photoBase64} alt={currentUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-slate-600" />
                    ) : (
                         <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-14 h-14 rounded-full" />
                    )}
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-200">Admin Dashboard</h1>
                        <p className="text-sm text-gray-400">Welcome, {currentUser.name} ({currentUser.designation})</p>
                    </div>
                </div>
                <button onClick={onLogout} className="px-4 py-2 rounded-md font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-transform duration-100 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 active:translate-y-0.5 shadow-lg">
                    Logout
                </button>
            </header>

            <main className="w-full bg-slate-800/40 rounded-2xl shadow-2xl p-4 md:p-6 border border-slate-800 backdrop-blur-sm">
                <div className="border-b border-slate-700 mb-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                         <button onClick={() => setActiveTab('students')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-lg transition-colors ${activeTab === 'students' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                            Student Management
                        </button>
                        {canManageStaff && (
                            <button onClick={() => setActiveTab('staff')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-lg transition-colors ${activeTab === 'staff' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                                Staff Management
                            </button>
                        )}
                        {canManageMarks && (
                             <button onClick={() => setActiveTab('marks')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-lg transition-colors ${activeTab === 'marks' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                                Mid-Term Assessment
                            </button>
                        )}
                        {canViewLogs && (
                            <button onClick={() => setActiveTab('logs')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-lg transition-colors ${activeTab === 'logs' ? 'border-indigo-400 text-indigo-300' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}`}>
                                Action Logs
                            </button>
                        )}
                    </nav>
                </div>

                {activeTab === 'students' && <StudentManagementPanel {...props} />}
                {activeTab === 'staff' && canManageStaff && <StaffManagementPanel {...props} />}
                 {activeTab === 'marks' && canManageMarks && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <div className="lg:col-span-2">
                             <MidTermAssessment 
                                currentUser={currentUser}
                                studentDirectory={props.studentDirectory}
                                departments={props.departments}
                                onSaveMarks={props.onUpdateMarks}
                                canDownloadReport={true}
                                onLogAction={props.onLogAction}
                            />
                         </div>
                         <div className="lg:col-span-1">
                             <h2 className="text-2xl font-bold text-indigo-300 mb-4">Instructions</h2>
                             <div className="bg-slate-900/50 p-4 rounded-lg text-gray-400 text-sm space-y-2">
                                <p>1. <span className="font-bold text-gray-300">Select Criteria:</span> Choose the year, department, subject, and mid-term exam.</p>
                                <p>2. <span className="font-bold text-gray-300">Load Students:</span> Click the button to display the student list.</p>
                                <p>3. <span className="font-bold text-gray-300">Enter Marks:</span> Input the marks for each student.</p>
                                <p>4. <span className="font-bold text-gray-300">Save Changes:</span> Click 'Save All Marks' to submit.</p>
                                <p>5. <span className="font-bold text-gray-300">Download Report:</span> After loading students, you can download the marks data as a CSV file.</p>
                             </div>
                         </div>
                    </div>
                )}
                 {activeTab === 'logs' && canViewLogs && <LogPanel adminDirectory={props.adminDirectory} />}
            </main>
        </div>
    );
};