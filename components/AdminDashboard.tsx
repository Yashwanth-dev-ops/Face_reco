import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AdminInfo, Designation, Year, AttendanceRecord, TimeTableEntry, LeaveRecord, Conversation, AttendanceAnomaly, StudyGroup, Notification, KnowledgeDocument } from '../types';
import { MidTermAssessment } from './MidTermAssessment';
import { MarkUpdate } from '../services/apiService';
import { DownloadReportModal } from './DownloadReportModal';
import { LogPanel } from './LogPanel';
import { BulkRegistrationPanel } from './BulkRegistrationPanel';
import { ConfirmationModal } from './ConfirmationModal';
import { BlockStudentModal } from './BlockStudentModal';
import { BulkBlockStudentModal } from './BulkBlockStudentModal';
import { TimetableManagementPanel } from './TimetableManagementPanel';
import { SubstituteSuggestionModal } from './SubstituteSuggestionModal';
import { LeaveManagementPanel } from './LeaveManagementPanel';
import { ToggleSwitch } from './ToggleSwitch';
import { CommunicationPanel } from './CommunicationPanel';
import { MyLeavePanel } from './MyLeavePanel';
import { exportStudentDetailsReportToCSV } from '../services/csvExportService';
import { AttendanceInsightsPanel } from './AttendanceInsightsPanel';
import { NotificationBell } from './NotificationBell';
import { BroadcastMessageModal } from './BroadcastMessageModal';
import { RAGKnowledgeBasePanel } from './RAGKnowledgeBasePanel';

type BulkRegisterResult = {
    successful: StudentInfo[];
    failed: { studentData: any; reason: string }[];
};

interface AdminDashboardProps {
    currentUser: AdminInfo;
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
    departments: string[];
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    timeTable: TimeTableEntry[];
    leaveRecords: LeaveRecord[];
    conversations: Conversation[];
    studyGroups: StudyGroup[];
    notifications: Notification[];
    onSendMessage: (receiverId: string, content: string, file?: { name: string; url: string }, isPriority?: boolean) => Promise<void>;
    onApproveLeave: (leaveId: string) => Promise<void>;
    onRejectLeave: (leaveId: string) => Promise<void>;
    onUpdateTimeTable: (entries: TimeTableEntry[]) => Promise<void>;
    onDeleteStudent: (rollNumber: string) => void;
    onBlockStudent: (rollNumber: string, durationMs: number | 'PERMANENT') => void;
    onUnblockStudent: (rollNumber: string) => void;
    onDeleteAdmin: (idNumber: string) => void;
    onToggleBlockAdmin: (idNumber: string) => void;
    onToggleAdminPresence: (idNumber: string) => void;
    onLogout: () => void;
    onDownload: (filteredAttendance: AttendanceRecord[]) => void;
    onUpdateMarks: (updates: MarkUpdate[]) => Promise<void>;
    onLogAction: (action: string, details: string) => void;
    onNavigateToAnalyzer: () => void;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    onNavigateToSettings: () => void;
    onBulkRegister: (studentsData: Omit<StudentInfo, 'blockExpiresAt' | 'isVerified' | 'password' | 'blockedBy' | 'onboarded' | 'marks' | 'predictions'>[], adminId: string) => Promise<BulkRegisterResult>;
    onUpdateTimetableEntry: (entry: TimeTableEntry) => Promise<void>;
    onNavigateToHolidayManagement: () => void;
    onRequestLeave: (startDate: string, endDate: string, reason: string) => Promise<void>;
    onCancelOwnLeave: (leaveId: string) => Promise<void>;
    onDeleteStudents: (rollNumbers: string[]) => void;
    onBlockStudents: (rollNumbers: string[], durationMs: number | 'PERMANENT') => void;
    onUnblockStudents: (rollNumbers: string[]) => void;
    onDeleteAdmins: (idNumbers: string[]) => void;
    onToggleAdminsBlock: (idNumbers: string[], block: boolean) => void;
    onGetAnomalies: (studentsToAnalyze: StudentInfo[]) => Promise<AttendanceAnomaly[]>;
    onDeleteStudyGroup: (groupId: string) => void;
    onMarkNotificationAsRead: (notificationId: string) => void;
    onMarkAllNotificationsAsRead: () => void;
    onSendBroadcast: (target: string, title: string, message: string) => Promise<void>;
    onQueryKnowledgeBase: (query: string) => Promise<{ answer: string; sources: KnowledgeDocument[] }>;
}

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

const UserManagementTable: React.FC<{
    users: (StudentInfo | AdminInfo)[];
    userType: 'student' | 'staff';
    currentUser: AdminInfo;
    onDelete: (id: string) => void;
    onBlock?: (user: StudentInfo) => void;
    onUnblock?: (id: string) => void;
    onToggleBlock?: (id: string) => void;
    onTogglePresence?: (id: string) => void;
}> = ({
    users,
    userType,
    currentUser,
    onDelete,
    onBlock,
    onUnblock,
    onToggleBlock,
    onTogglePresence
}) => {

    const isHighPrivilege = [Designation.Principal, Designation.VicePrincipal, Designation.Chairman].includes(currentUser.designation);

    return (
         <div className="max-h-[60vh] overflow-auto custom-scrollbar border border-gray-700 rounded-lg">
            <table className="w-full text-left min-w-[700px]">
                <thead className="sticky top-0 bg-gray-800 z-10">
                    <tr>
                        <th className="p-3 text-sm font-semibold text-gray-400">Name</th>
                        <th className="p-3 text-sm font-semibold text-gray-400">ID</th>
                        {userType === 'student' && (
                            <>
                                <th className="p-3 text-sm font-semibold text-gray-400">Department</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Year</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Section</th>
                            </>
                        )}
                         {userType === 'staff' && (
                            <>
                                <th className="p-3 text-sm font-semibold text-gray-400">Department</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Designation</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Presence</th>
                            </>
                        )}
                        <th className="p-3 text-sm font-semibold text-gray-400">Status</th>
                        <th className="p-3 text-sm font-semibold text-gray-400">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                    {users.map((user: StudentInfo | AdminInfo) => {
                        const isStudent = userType === 'student';
                        const studentUser = user as StudentInfo;
                        const adminUser = user as AdminInfo;
                        const isBlocked = isStudent ? (studentUser.blockExpiresAt && studentUser.blockExpiresAt > Date.now()) : adminUser.isBlocked;

                        const canPerformDestructiveActions = userType === 'staff' 
                            ? isHighPrivilege 
                            : (isHighPrivilege || currentUser.designation === Designation.HOD);

                        return (
                            <tr key={isStudent ? studentUser.rollNumber : adminUser.idNumber} className="hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-white">{user.name}</td>
                                <td className="p-3 text-sm text-gray-300 font-mono">{isStudent ? studentUser.rollNumber : adminUser.idNumber}</td>
                                {isStudent && (
                                    <>
                                        <td className="p-3 text-sm text-gray-300">{studentUser.department}</td>
                                        <td className="p-3 text-sm text-gray-300">{studentUser.year}</td>
                                        <td className="p-3 text-sm text-gray-300">{studentUser.section}</td>
                                    </>
                                )}
                                {userType === 'staff' && (
                                    <>
                                        <td className="p-3 text-sm text-gray-300">{adminUser.department}</td>
                                        <td className="p-3 text-sm text-gray-300">{adminUser.designation}</td>
                                        <td className="p-3 text-sm">{adminUser.isPresentToday ?? true ? <span className="text-green-400">Available</span> : <span className="text-red-400">Unavailable</span>}</td>
                                    </>
                                )}
                                <td className="p-3 text-sm">{isBlocked ? <span className="text-red-400 font-semibold">Blocked</span> : <span className="text-green-400 font-semibold">Active</span>}</td>
                                <td className="p-3 text-sm space-x-2">
                                    {isHighPrivilege && (
                                        <>
                                            <button onClick={() => isBlocked ? (onUnblock && onUnblock(studentUser.rollNumber)) : (onBlock ? onBlock(studentUser) : onToggleBlock && onToggleBlock(adminUser.idNumber))} className="text-yellow-400 hover:underline">
                                                {isBlocked ? 'Unblock' : 'Block'}
                                            </button>
                                            <button onClick={() => onDelete(isStudent ? studentUser.rollNumber : adminUser.idNumber)} className="text-red-400 hover:underline">Delete</button>
                                        </>
                                    )}
                                     {!isStudent && onTogglePresence && (
                                        <button onClick={() => onTogglePresence(adminUser.idNumber)} className="text-blue-400 hover:underline">
                                            {adminUser.isPresentToday ?? true ? 'Mark Unavailable' : 'Mark Available'}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = (props) => {
    const { currentUser, studentDirectory, adminDirectory, departments, timeTable, leaveRecords, conversations, onLogout, onNavigateToSettings, notifications, onMarkNotificationAsRead, onMarkAllNotificationsAsRead, onSendBroadcast, onQueryKnowledgeBase } = props;
    const [activeTab, setActiveTab] = useState('students');
    const [substituteModalEntry, setSubstituteModalEntry] = useState<TimeTableEntry | null>(null);
    const [downloadModalOpen, setDownloadModalOpen] = useState(false);
    const [blockStudentTarget, setBlockStudentTarget] = useState<StudentInfo | null>(null);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

    // RBAC Checks
    const isHighPrivilege = useMemo(() => [Designation.Principal, Designation.VicePrincipal, Designation.Chairman].includes(currentUser.designation), [currentUser.designation]);
    const isHOD = useMemo(() => currentUser.designation === Designation.HOD, [currentUser.designation]);

    // Student filters
    const [studentSearch, setStudentSearch] = useState('');
    const [studentDeptFilter, setStudentDeptFilter] = useState(isHOD ? currentUser.department : 'ALL');
    const [studentYearFilter, setStudentYearFilter] = useState<Year | 'ALL'>('ALL');
    const [studentStatusFilter, setStudentStatusFilter] = useState('ALL');

    // Staff filters
    const [staffSearch, setStaffSearch] = useState('');
    const [staffDeptFilter, setStaffDeptFilter] = useState(isHOD ? currentUser.department : 'ALL');
    const [staffDesignationFilter, setStaffDesignationFilter] = useState<Designation | 'ALL'>('ALL');
    const [staffStatusFilter, setStaffStatusFilter] = useState('ALL');
    const [staffPresenceFilter, setStaffPresenceFilter] = useState('ALL');

    // FIX: This wrapper is created to satisfy the prop type of AttendanceInsightsPanel, which does not expect a 'file' parameter.
    // The type error was likely mis-reported on a different component.
    const handleSendMessageNoFile = (receiverId: string, content: string, isPriority?: boolean) => {
        return props.onSendMessage(receiverId, content, undefined, isPriority);
    };

    const visibleStudents = useMemo(() => {
        const allStudents = Array.from<StudentInfo>(studentDirectory.values());
        if (isHOD) {
            return allStudents.filter(s => s.department === currentUser.department);
        }
        return allStudents;
    }, [studentDirectory, isHOD, currentUser.department]);

    const visibleAdmins = useMemo(() => {
        const allAdmins = Array.from<AdminInfo>(adminDirectory.values());
        if (isHOD) {
            // HODs can see themselves and staff in their department
            return allAdmins.filter(a => a.department === currentUser.department);
        }
        return allAdmins;
    }, [adminDirectory, isHOD, currentUser.department]);


    const filteredStudents = useMemo(() => {
        return visibleStudents.filter((s: StudentInfo) => {
            const searchLower = studentSearch.toLowerCase();
            const matchesSearch = studentSearch === '' || s.name.toLowerCase().includes(searchLower) || s.rollNumber.toLowerCase().includes(searchLower);
            const matchesDept = studentDeptFilter === 'ALL' || s.department === studentDeptFilter;
            const matchesYear = studentYearFilter === 'ALL' || s.year === studentYearFilter;
            
            const isBlocked = s.blockExpiresAt && s.blockExpiresAt > Date.now();
            const matchesStatus = studentStatusFilter === 'ALL' || 
                                  (studentStatusFilter === 'ACTIVE' && !isBlocked) ||
                                  (studentStatusFilter === 'BLOCKED' && isBlocked);

            return matchesSearch && matchesDept && matchesYear && matchesStatus;
        });
    }, [visibleStudents, studentSearch, studentDeptFilter, studentYearFilter, studentStatusFilter]);

    const filteredAdmins = useMemo(() => {
        return visibleAdmins.filter((a: AdminInfo) => {
            const searchLower = staffSearch.toLowerCase();
            const matchesSearch = staffSearch === '' || a.name.toLowerCase().includes(searchLower) || a.idNumber.toLowerCase().includes(searchLower);
            const matchesDept = staffDeptFilter === 'ALL' || a.department === staffDeptFilter;
            const matchesDesignation = staffDesignationFilter === 'ALL' || a.designation === staffDesignationFilter;

            const isBlocked = !!a.isBlocked;
            const matchesStatus = staffStatusFilter === 'ALL' || 
                                  (staffStatusFilter === 'ACTIVE' && !isBlocked) ||
                                  (staffStatusFilter === 'BLOCKED' && isBlocked);
            
            const isPresent = a.isPresentToday ?? true;
            const matchesPresence = staffPresenceFilter === 'ALL' ||
                                    (staffPresenceFilter === 'AVAILABLE' && isPresent) ||
                                    (staffPresenceFilter === 'UNAVAILABLE' && !isPresent);

            return matchesSearch && matchesDept && matchesDesignation && matchesStatus && matchesPresence;
        });
    }, [visibleAdmins, staffSearch, staffDeptFilter, staffDesignationFilter, staffStatusFilter, staffPresenceFilter]);

    const academicDepartments = useMemo(() => departments.filter(d => d !== 'Administration'), [departments]);
    
    const availableDesignations = isHOD
        ? [Designation.Teacher, Designation.Incharge]
        : Object.values(Designation);

    const handleDownloadReport = (department: string, year: Year | 'ALL', section: string, time: string) => {
        const students: StudentInfo[] = Array.from<StudentInfo>(studentDirectory.values()).filter((s: StudentInfo) =>
            (department === 'ALL' || s.department === department) &&
            (year === 'ALL' || s.year === year) &&
            (section === 'ALL' || s.section === section)
        );
        exportStudentDetailsReportToCSV(students, Array.from(adminDirectory.values()));
        props.onLogAction('Download Report', `Downloaded student details report for Dept: ${department}, Year: ${year}, Sec: ${section}`);
        setDownloadModalOpen(false);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'students':
                return (
                    <div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                            <input type="text" placeholder="Search by Name/Roll..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="col-span-2 md:col-span-1 w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"/>
                            <select value={studentDeptFilter} onChange={e => setStudentDeptFilter(e.target.value)} disabled={isHOD} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:bg-gray-800 disabled:cursor-not-allowed">
                                {isHOD ? (
                                    <option value={currentUser.department}>{currentUser.department}</option>
                                ) : (
                                    <>
                                        <option value="ALL">All Departments</option>
                                        {academicDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </>
                                )}
                            </select>
                            <select value={studentYearFilter} onChange={e => setStudentYearFilter(e.target.value as Year | 'ALL')} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                                <option value="ALL">All Years</option>
                                {Object.values(Year).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                             <select value={studentStatusFilter} onChange={e => setStudentStatusFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Displaying {filteredStudents.length} of {visibleStudents.length} students</h3>
                        <UserManagementTable currentUser={currentUser} userType="student" users={filteredStudents} onDelete={props.onDeleteStudent} onBlock={setBlockStudentTarget} onUnblock={props.onUnblockStudent} />
                    </div>
                );
            case 'staff':
                 return (
                    <div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                            <input type="text" placeholder="Search by Name/ID..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"/>
                            <select value={staffDeptFilter} onChange={e => setStaffDeptFilter(e.target.value)} disabled={isHOD} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white disabled:bg-gray-800 disabled:cursor-not-allowed">
                                {isHOD ? (
                                    <option value={currentUser.department}>{currentUser.department}</option>
                                ) : (
                                    <>
                                        <option value="ALL">All Departments</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </>
                                )}
                            </select>
                            <select value={staffDesignationFilter} onChange={e => setStaffDesignationFilter(e.target.value as Designation | 'ALL')} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                                <option value="ALL">All Designations</option>
                                {availableDesignations.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                             <select value={staffStatusFilter} onChange={e => setStaffStatusFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active</option>
                                <option value="BLOCKED">Blocked</option>
                            </select>
                             <select value={staffPresenceFilter} onChange={e => setStaffPresenceFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white">
                                <option value="ALL">All Presences</option>
                                <option value="AVAILABLE">Available</option>
                                <option value="UNAVAILABLE">Unavailable</option>
                            </select>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Displaying {filteredAdmins.length} of {visibleAdmins.length} staff members</h3>
                        <UserManagementTable currentUser={currentUser} userType="staff" users={filteredAdmins} onDelete={props.onDeleteAdmin} onToggleBlock={props.onToggleBlockAdmin} onTogglePresence={props.onToggleAdminPresence} />
                    </div>
                );
            case 'insights':
                return <AttendanceInsightsPanel students={filteredStudents} onGetAnomalies={props.onGetAnomalies} studentDirectory={studentDirectory} adminDirectory={adminDirectory} onSendMessage={handleSendMessageNoFile} onLogAction={props.onLogAction} />;
            case 'knowledge':
                return <RAGKnowledgeBasePanel onQuery={onQueryKnowledgeBase} />;
            case 'bulk-register':
                return <BulkRegistrationPanel onRegister={props.onBulkRegister} currentUser={currentUser} />;
            case 'marks':
                return <MidTermAssessment currentUser={currentUser} studentDirectory={studentDirectory} departments={departments} onSaveMarks={props.onUpdateMarks} canDownloadReport={true} onLogAction={props.onLogAction} />;
            case 'timetable':
                return <TimetableManagementPanel timeTable={timeTable} onSave={props.onUpdateTimeTable} onUpdateEntry={props.onUpdateTimetableEntry} onFindSubstitute={setSubstituteModalEntry} admins={Array.from(adminDirectory.values())} departments={departments} />;
            case 'leave-requests':
                return <LeaveManagementPanel currentUser={currentUser} allAdmins={Array.from(adminDirectory.values())} leaveRecords={leaveRecords} onApproveLeave={props.onApproveLeave} onRejectLeave={props.onRejectLeave} />;
            case 'my-leave':
                return <MyLeavePanel currentUser={currentUser} leaveRecords={leaveRecords} onRequestLeave={props.onRequestLeave} onCancelOwnLeave={props.onCancelOwnLeave} />;
            case 'logs':
                return <LogPanel adminDirectory={adminDirectory} />;
            case 'communications':
                return <CommunicationPanel currentUser={{ ...currentUser, userType: 'ADMIN' }} conversations={conversations} onSendMessage={props.onSendMessage} studentDirectory={studentDirectory} adminDirectory={adminDirectory} onQueryKnowledgeBase={props.onQueryKnowledgeBase} />;
            default:
                return null;
        }
    };

    const tabs = [
        { id: 'students', label: 'Student Management' },
        { id: 'staff', label: 'Staff Management' },
        { id: 'insights', label: 'AI Insights' },
        { id: 'knowledge', label: 'Knowledge Base' },
        { id: 'bulk-register', label: 'Bulk Registration' },
        { id: 'marks', label: 'Marks Assessment' },
        { id: 'timetable', label: 'Timetable' },
        { id: 'leave-requests', label: 'Leave Requests' },
        { id: 'my-leave', label: 'My Leave' },
        { id: 'logs', label: 'Action Logs' },
        { id: 'communications', label: 'Communications' },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-slide-up p-4 sm:p-6 lg:p-8">
            {substituteModalEntry && <SubstituteSuggestionModal entry={substituteModalEntry} onClose={() => setSubstituteModalEntry(null)} onSelectSubstitute={(entry, newTeacherId) => { props.onUpdateTimetableEntry({ ...entry, teacherId: newTeacherId, isAbsent: false }); setSubstituteModalEntry(null); }} allTeachers={Array.from(adminDirectory.values())} fullTimeTable={timeTable} />}
            {downloadModalOpen && <DownloadReportModal onClose={() => setDownloadModalOpen(false)} onSubmit={handleDownloadReport} title="Download Student Details Report" departments={departments} currentUser={currentUser} />}
            {blockStudentTarget && <BlockStudentModal student={blockStudentTarget} currentUser={currentUser} onClose={() => setBlockStudentTarget(null)} onBlock={(...args) => { props.onBlockStudent(...args); setBlockStudentTarget(null); }} />}
            {isBroadcastModalOpen && <BroadcastMessageModal currentUser={currentUser} departments={departments} onClose={() => setIsBroadcastModalOpen(false)} onSendBroadcast={onSendBroadcast} />}

            <header className="mb-6 w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="flex items-center gap-4">
                     {currentUser.photoBase64 ? <img src={currentUser.photoBase64} alt={currentUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-600" /> : <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Logo" className="w-14 h-14 rounded-full" />}
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">Administrator Dashboard</h1>
                        <p className="text-sm text-gray-400">Welcome, {currentUser.name} ({currentUser.designation})</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell 
                        notifications={notifications}
                        onMarkAsRead={onMarkNotificationAsRead}
                        onMarkAllAsRead={onMarkAllNotificationsAsRead}
                    />
                    <button onClick={() => setIsBroadcastModalOpen(true)} className="px-4 py-2 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all">Broadcast</button>
                    <button onClick={() => setDownloadModalOpen(true)} className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-all">Download Report</button>
                    <button onClick={onNavigateToSettings} className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-all">Settings</button>
                    <button onClick={props.onNavigateToHolidayManagement} className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-all">Holidays</button>
                    <button onClick={onLogout} className="px-4 py-2 rounded-lg font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all">Logout</button>
                </div>
            </header>
            
            <main className="w-full">
                <div className="mb-6">
                    <nav className="flex space-x-2 sm:space-x-4 bg-gray-800/50 p-2 rounded-xl border border-gray-700 overflow-x-auto no-scrollbar">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
                {renderTabContent()}
            </main>
        </div>
    );
};
