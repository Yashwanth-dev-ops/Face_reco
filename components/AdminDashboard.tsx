
import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AdminInfo, Designation, Year, AttendanceRecord } from '../types';
import { emotionUIConfig } from './uiConfig';
import { exportMonthlySummaryToCSV, exportMarksReportToCSV, exportStudentDetailsReportToCSV } from '../services/csvExportService';
import { MarksEntry } from './MarksEntry';
import { MarkUpdate } from '../services/apiService';
import { DownloadReportModal } from './DownloadReportModal';

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
}

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const BlockIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor">
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
    const { currentUser, studentDirectory, adminDirectory, departments, attendance, faceLinks, onDeleteStudent, onToggleBlockStudent, onDownload } = props;
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

    // Direct download handlers for specific-section incharges
    const downloadDailyLogForFiltered = () => {
        const filteredRollNumbers = new Set(filteredStudents.map(s => s.rollNumber));
        const persistentIdsForReport = new Set<number>();
        // FIX: The callback parameters for Map.forEach were swapped, causing a type mismatch.
        // For `faceLinks: Map<number, string>`, the callback is `(value: string, key: number)`.
        // The parameter order has been corrected to `(roll, pid)` to match this signature.
        faceLinks.forEach((roll, pid) => {
            if (filteredRollNumbers.has(roll)) {
                persistentIdsForReport.add(pid);
            }
        });
        const filteredAttendance = attendance.filter(record => persistentIdsForReport.has(record.persistentId));
        onDownload(filteredAttendance);
    };
    const downloadMonthlySummaryForFiltered = () => exportMonthlySummaryToCSV(filteredStudents, attendance, faceLinks);
    const downloadStudentDetailsForFiltered = () => exportStudentDetailsReportToCSV(filteredStudents, Array.from(adminDirectory.values()));


    const handleDownloadRequest = (type: 'daily' | 'monthly' | 'details') => {
        const isPrivilegedUser = [Designation.Principal, Designation.VicePrincipal, Designation.HOD].includes(currentUser.designation);
        const isInchargeForAllSections = currentUser.designation === Designation.Incharge && (!currentUser.section || currentUser.section === 'All Sections');

        if (isPrivilegedUser || isInchargeForAllSections) {
            setReportTypeToDownload(type);
            setIsDownloadModalOpen(true);
        } else {
            // Incharge for a specific section, download directly
            if (type === 'daily') downloadDailyLogForFiltered();
            else if (type === 'monthly') downloadMonthlySummaryForFiltered();
            else if (type === 'details') downloadStudentDetailsForFiltered();
        }
    };
    
    const handleModalDownloadSubmit = (selectedYear: Year, selectedSection: string) => {
        const departmentToFilter = (currentUser.designation === Designation.HOD || currentUser.designation === Designation.Incharge)
            ? currentUser.department
            : 'ALL';

        const studentsForReport = Array.from(studentDirectory.values()).filter(student => {
            const departmentMatch = departmentToFilter === 'ALL' || student.department === departmentToFilter;
            const yearMatch = student.year === selectedYear;
            const sectionMatch = selectedSection === 'ALL' || student.section === selectedSection;
            return departmentMatch && yearMatch && sectionMatch;
        });

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

    const getReportTitle = () => {
        switch(reportTypeToDownload) {
            case 'daily': return 'Download Daily Attendance Log';
            case 'monthly': return 'Download Monthly Summary';
            case 'details': return 'Download Student Details';
            default: return 'Download Report';
        }
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
                />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-300 mb-4">Actions</h2>
                         <div className="space-y-3">
                            <button onClick={() => handleDownloadRequest('daily')} disabled={studentDirectory.size === 0} className="w-full px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5">
                                Download Daily Log (CSV)
                            </button>
                             <button onClick={() => handleDownloadRequest('monthly')} disabled={studentDirectory.size === 0} className="w-full px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5">
                                Download Monthly Summary (CSV)
                            </button>
                            <button onClick={() => handleDownloadRequest('details')} disabled={studentDirectory.size === 0} className="w-full px-6 py-3 rounded-full font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5">
                                Download Student Details (CSV)
                            </button>
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
                            <p className="text-center text-gray-500 p-8">No students found matching your filters.</p>
                        ) : (
                            <div className="divide-y divide-slate-800">
                            {filteredStudents.map(student => (
                                <div key={student.rollNumber} className={`p-4 flex justify-between items-center ${student.isBlocked ? 'opacity-50' : 'hover:bg-slate-800/60 transition-colors cursor-pointer'}`}>
                                    <div className="flex items-center gap-4 flex-grow" onClick={() => !student.isBlocked && setSelectedStudent(student)}>
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
    const [activeTab, setActiveTab] = useState<'students' | 'staff' | 'marks'>('students');

    const canManageStaff = currentUser.designation === Designation.Principal || currentUser.designation === Designation.VicePrincipal;
    const canManageMarks = [Designation.Principal, Designation.VicePrincipal, Designation.HOD, Designation.Incharge].includes(currentUser.designation);
    
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
                                Marks Entry
                            </button>
                        )}
                    </nav>
                </div>

                {activeTab === 'students' && <StudentManagementPanel {...props} />}
                {activeTab === 'staff' && canManageStaff && <StaffManagementPanel {...props} />}
                 {activeTab === 'marks' && canManageMarks && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                         <div className="lg:col-span-2">
                             <MarksEntry 
                                currentUser={currentUser}
                                studentDirectory={props.studentDirectory}
                                departments={props.departments}
                                onSaveMarks={props.onUpdateMarks}
                            />
                         </div>
                         <div className="lg:col-span-1">
                             <h2 className="text-2xl font-bold text-indigo-300 mb-4">Instructions</h2>
                             <div className="bg-slate-900/50 p-4 rounded-lg text-gray-400 text-sm space-y-2">
                                <p>1. <span className="font-bold text-gray-300">Select Criteria:</span> Choose the year, department, subject, and mid-term exam.</p>
                                <p>2. <span className="font-bold text-gray-300">Load Students:</span> Click the button to display the student list.</p>
                                <p>3. <span className="font-bold text-gray-300">Enter Marks:</span> Input the marks for each student.</p>
                                <p>4. <span className="font-bold text-gray-300">Save Changes:</span> Click 'Save All Marks' to submit.</p>
                             </div>
                         </div>
                    </div>
                )}
            </main>
        </div>
    );
};
