


import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AdminInfo, Designation, Year, AttendanceRecord } from '../types';
import { emotionUIConfig } from './uiConfig';

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
}

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const BlockIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            <p className="text-md text-indigo-300 mt-1">{student.department} - {student.year}</p>
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

const StudentManagementPanel: React.FC<Omit<AdminDashboardProps, 'adminDirectory' | 'onDeleteAdmin' | 'onToggleBlockAdmin'>> = (props) => {
    const { currentUser, studentDirectory, departments, attendance, faceLinks, onDeleteStudent, onToggleBlockStudent, onDownload } = props;
    const [selectedStudent, setSelectedStudent] = useState<StudentInfo | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('ALL');

    const hasFullControl = currentUser.designation === Designation.Principal || currentUser.designation === Designation.VicePrincipal || currentUser.designation === Designation.HOD;
    const canDelete = currentUser.designation !== Designation.Incharge;

     useEffect(() => {
        if (currentUser.designation === Designation.HOD || currentUser.designation === Designation.Incharge) {
            setDepartmentFilter(currentUser.department);
        }
        if (currentUser.designation === Designation.Incharge) {
            setYearFilter(Year.First); // Default to first year for incharge
        }
    }, [currentUser]);


    const filteredStudents = useMemo(() => {
        return Array.from(studentDirectory.values()).filter(student => {
            const departmentMatch = departmentFilter === 'ALL' || student.department === departmentFilter;
            const yearMatch = yearFilter === 'ALL' || student.year === yearFilter;
            return departmentMatch && yearMatch;
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [studentDirectory, departmentFilter, yearFilter]);

    const handleDownloadClick = () => {
        const filteredRollNumbers = new Set(filteredStudents.map(s => s.rollNumber));
        const persistentIdsForReport = new Set<number>();
        for (const [pid, roll] of faceLinks.entries()) {
            if (filteredRollNumbers.has(roll)) {
                persistentIdsForReport.add(pid);
            }
        }
        const filteredAttendance = attendance.filter(record => persistentIdsForReport.has(record.persistentId));
        onDownload(filteredAttendance);
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-indigo-300 mb-4">Actions</h2>
                         <button onClick={handleDownloadClick} disabled={filteredStudents.length === 0} className="w-full px-6 py-3 rounded-lg text-lg font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 ease-in-out shadow-lg transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-0.5">
                            Download Report (CSV)
                        </button>
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
                            <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} disabled={currentUser.designation !== Designation.Principal && currentUser.designation !== Designation.VicePrincipal} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition">
                                {currentUser.designation !== Designation.HOD && currentUser.designation !== Designation.Incharge && <option value="ALL">All Departments</option>}
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition">
                                {(currentUser.designation !== Designation.Incharge) && <option value="ALL">All Years</option>}
                                {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                     </div>
                     <div className="bg-slate-900/50 rounded-lg max-h-[60vh] overflow-y-auto">
                        {filteredStudents.length === 0 ? (
                            <p className="text-center text-gray-500 p-8">No students match the current filters.</p>
                        ) : (
                            <div className="divide-y divide-slate-800">
                            {filteredStudents.map(student => (
                                <div key={student.rollNumber} onClick={() => setSelectedStudent(student)} className={`p-4 flex justify-between items-center hover:bg-slate-800/60 transition-colors cursor-pointer ${student.isBlocked ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-4">
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
                                            <p className="text-xs text-indigo-300 bg-indigo-900/50 inline-block px-2 py-0.5 rounded mt-1">{student.department} - {student.year}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {hasFullControl && (
                                            <button onClick={(e) => { e.stopPropagation(); onToggleBlockStudent(student.rollNumber); }} className="text-gray-500 hover:text-yellow-500 transition-colors p-2 rounded-full hover:bg-yellow-500/10" title={student.isBlocked ? "Unblock Student" : "Block Student"}>
                                                <BlockIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button onClick={(e) => { e.stopPropagation(); onDeleteStudent(student.rollNumber); }} className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10" title="Delete Student">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
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

const StaffManagementPanel: React.FC<Pick<AdminDashboardProps, 'adminDirectory' | 'onDeleteAdmin' | 'onToggleBlockAdmin'>> = ({ adminDirectory, onDeleteAdmin, onToggleBlockAdmin }) => {
    
    const staffList = useMemo(() => {
        return Array.from(adminDirectory.values())
            .filter(admin => admin.designation !== Designation.Principal)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [adminDirectory]);

    return (
        <div className="lg:col-span-2">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-indigo-300">Registered Staff ({staffList.length})</h2>
             </div>
             <div className="bg-slate-900/50 rounded-lg max-h-[60vh] overflow-y-auto">
                {staffList.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">No other staff members found.</p>
                ) : (
                    <div className="divide-y divide-slate-800">
                    {staffList.map(staff => (
                        <div key={staff.idNumber} className={`p-4 flex justify-between items-center hover:bg-slate-800/60 transition-colors ${staff.isBlocked ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-4">
                                {staff.photoBase64 ? (
                                    <img src={staff.photoBase64} alt={staff.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-600" />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-indigo-300 font-bold text-lg">
                                        {staff.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-white">{staff.name} {staff.isBlocked && <span className="text-xs font-bold text-red-400">(Blocked)</span>}</p>
                                    <p className="text-sm text-gray-400">{staff.idNumber}</p>
                                    <p className="text-xs text-teal-300 bg-teal-900/50 inline-block px-2 py-0.5 rounded mt-1">{staff.designation} - {staff.department}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => onToggleBlockAdmin(staff.idNumber)} className="text-gray-500 hover:text-yellow-500 transition-colors p-2 rounded-full hover:bg-yellow-500/10" title={staff.isBlocked ? "Unblock Staff" : "Block Staff"}>
                                    <BlockIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => onDeleteAdmin(staff.idNumber)} className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10" title="Delete Staff">
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    </div>
                )}
             </div>
        </div>
    );
};


export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
    const { currentUser, onLogout } = props;
    const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');

    const isPrincipal = currentUser.designation === Designation.Principal;

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
                {isPrincipal && (
                     <div className="border-b border-slate-700 mb-6">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button
                                onClick={() => setActiveTab('students')}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-lg transition-colors ${
                                    activeTab === 'students'
                                    ? 'border-indigo-400 text-indigo-300'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                                }`}
                            >
                                Student Management
                            </button>
                            <button
                                onClick={() => setActiveTab('staff')}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-lg transition-colors ${
                                    activeTab === 'staff'
                                    ? 'border-indigo-400 text-indigo-300'
                                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                                }`}
                            >
                                Staff Management
                            </button>
                        </nav>
                    </div>
                )}
                
                {isPrincipal ? (
                    activeTab === 'students' ? (
                        <StudentManagementPanel {...props} />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <h2 className="text-2xl font-bold text-indigo-300 mb-4">Staff Controls</h2>
                                <div className="bg-slate-900/50 p-4 rounded-lg text-gray-400 text-sm space-y-2">
                                    <p><span className="font-bold text-gray-300">Block/Unblock:</span> Toggle a staff member's ability to log in.</p>
                                    <p><span className="font-bold text-gray-300">Delete:</span> Permanently remove a staff member's account.</p>
                                    <p className="text-xs text-yellow-400 pt-2 border-t border-slate-700/50">Note: Principal accounts cannot be blocked or deleted.</p>
                                </div>
                            </div>
                            <StaffManagementPanel {...props} />
                        </div>
                    )
                ) : (
                     <StudentManagementPanel {...props} />
                )}
            </main>
        </div>
    );
};