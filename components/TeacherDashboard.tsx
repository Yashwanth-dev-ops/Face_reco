import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AdminInfo, Year, AttendanceRecord, TimeTableEntry, Designation, Conversation, LeaveRecord, Notification, KnowledgeDocument } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { MidTermAssessment } from './MidTermAssessment';
import { MarkUpdate } from '../services/apiService';
import { exportAttendanceToCSV } from '../services/csvExportService';
import { CommunicationPanel } from './CommunicationPanel';
import { MyLeavePanel } from './MyLeavePanel';
import { NotificationBell } from './NotificationBell';
import { RAGKnowledgeBasePanel } from './RAGKnowledgeBasePanel';

interface TeacherDashboardProps {
    currentUser: AdminInfo;
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    timeTable: TimeTableEntry[];
    leaveRecords: LeaveRecord[];
    departments: string[];
    conversations: Conversation[];
    notifications: Notification[];
    onSendMessage: (receiverId: string, content: string, file?: { name: string; url: string }, isPriority?: boolean) => Promise<void>;
    onLogout: () => void;
    onStartAnalyzer: (subject: string) => void;
    onNavigateToSettings: () => void;
    onSetManualAttendance: (studentRollNumber: string, subject: string, status: 'present' | 'absent') => Promise<void>;
    onUpdateMarks: (updates: MarkUpdate[]) => Promise<void>;
    onLogAction: (action: string, details: string) => void;
    onRequestLeave: (startDate: string, endDate: string, reason: string) => Promise<void>;
    onCancelOwnLeave: (leaveId: string) => Promise<void>;
    onToggleAdminPresence: (idNumber: string) => void;
    onMarkNotificationAsRead: (notificationId: string) => void;
    onMarkAllNotificationsAsRead: () => void;
    onQueryKnowledgeBase: (query: string) => Promise<{ answer: string; sources: KnowledgeDocument[] }>;
}

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

// Determines a student's final attendance status based on override logic
const getStudentAttendanceStatus = (
    student: StudentInfo,
    classSubject: string,
    classDate: Date,
    attendance: AttendanceRecord[],
    faceLinks: Map<number, string>
): 'present' | 'absent' | 'pending' => {
    
    const persistentId = Array.from(faceLinks.entries()).find(([, roll]) => roll === student.rollNumber)?.[0];
    if (persistentId === undefined) return 'pending';

    const classDateString = classDate.toDateString();
    const recordsForStudent = attendance.filter(rec => 
        rec.persistentId === persistentId &&
        rec.subject === classSubject &&
        new Date(rec.timestamp).toDateString() === classDateString
    );

    if (recordsForStudent.length === 0) return 'absent';

    const manualRecords = recordsForStudent.filter(r => r.source === 'Manual').sort((a,b) => b.timestamp - a.timestamp);
    if (manualRecords.length > 0) {
        return manualRecords[0].status;
    }

    const aiRecords = recordsForStudent.filter(r => r.source === 'AI');
    if (aiRecords.length > 0) {
        return 'present';
    }

    return 'absent';
};

type ClassRosterProps = {
    entry: TimeTableEntry;
    students: StudentInfo[];
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    onSetManualAttendance: (studentRollNumber: string, subject: string, status: 'present' | 'absent') => Promise<void>;
};

const ClassRoster: React.FC<ClassRosterProps> = ({ entry, students, attendance, faceLinks, onSetManualAttendance }) => {
    
    return (
        <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
             <div className="max-h-60 overflow-auto custom-scrollbar">
                <table className="w-full text-left">
                     <thead className="sticky top-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm">
                        <tr>
                            <th className="p-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Name</th>
                            <th className="p-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Roll Number</th>
                            <th className="p-2 text-xs font-semibold text-gray-500 dark:text-gray-400 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                        {students.map((student, index) => {
                            const status = getStudentAttendanceStatus(student, entry.subject, new Date(), attendance, faceLinks);
                            const isPresent = status === 'present';
                            return (
                                <tr key={student.rollNumber} className="animate-stagger-in" style={{ animationDelay: `${index * 30}ms`, opacity: 0 }}>
                                    <td className="p-2 text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                                    <td className="p-2 text-sm font-mono text-gray-600 dark:text-gray-400">{student.rollNumber}</td>
                                    <td className="p-2 text-right">
                                         <ToggleSwitch 
                                            checked={isPresent} 
                                            onChange={(checked) => onSetManualAttendance(student.rollNumber, entry.subject, checked ? 'present' : 'absent')} 
                                        />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
             </div>
        </div>
    );
};

const ClassEntryCard: React.FC<{
    entry: TimeTableEntry;
    isCurrent: boolean;
    isPast: boolean;
    students: StudentInfo[];
    expandedClassId: string | null;
    onExpand: (id: string | null) => void;
    rosterProps: Omit<ClassRosterProps, 'entry' | 'students'>
}> = ({ entry, isCurrent, isPast, students, expandedClassId, onExpand, rosterProps }) => {
    const cardClass = entry.isCancelled
        ? 'bg-gray-100 dark:bg-gray-800 opacity-60 border-yellow-500'
        : entry.isAbsent
        ? 'bg-gray-100 dark:bg-gray-800 opacity-60 border-red-500'
        : isCurrent
        ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 shadow-lg'
        : isPast
        ? 'bg-gray-100 dark:bg-gray-800 opacity-70 border-gray-500'
        : 'bg-white dark:bg-gray-900/30 border-gray-700';

    return (
        <div className={`p-4 rounded-xl border-l-4 transition-all duration-300 ${cardClass}`}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{entry.startTime} - {entry.endTime}</span>
                        {isCurrent && !entry.isAbsent && !entry.isCancelled && <span className="text-xs font-bold text-blue-500 bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full animate-pulse">LIVE</span>}
                        {entry.isAbsent && <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/50 px-2 py-1 rounded-full">SUBSTITUTE NEEDED</span>}
                        {entry.isCancelled && <span className="text-xs font-bold text-yellow-500 bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded-full">CANCELLED</span>}
                    </div>
                    <p className={`font-bold text-lg text-gray-900 dark:text-white mt-1 ${entry.isCancelled ? 'line-through' : ''}`}>{entry.subject}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{entry.department} / {entry.year} / Sec {entry.section}</p>
                    {entry.isCancelled && <p className="text-xs font-semibold text-yellow-500 dark:text-yellow-400 mt-1">{entry.cancellationReason}</p>}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    <button onClick={() => onExpand(expandedClassId === entry.id ? null : entry.id)} disabled={!!entry.isAbsent || !!entry.isCancelled} className="px-3 py-2 text-sm rounded-lg font-semibold text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        Roster ({students.length})
                    </button>
                </div>
            </div>
            {expandedClassId === entry.id && !entry.isAbsent && !entry.isCancelled && <ClassRoster entry={entry} students={students} {...rosterProps} />}
        </div>
    );
};

const TeacherReportPanel: React.FC<Pick<TeacherDashboardProps, 'currentUser' | 'timeTable' | 'studentDirectory'>> = ({
    currentUser,
    timeTable,
    studentDirectory
}) => {
    const uniqueClasses = useMemo(() => {
        const classMap = new Map<string, {
            entry: TimeTableEntry,
            studentsCount: number,
            schedule: { day: string, time: string }[]
        }>();
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        timeTable.forEach(entry => {
            if (entry.teacherId === currentUser.idNumber) {
                const key = `${entry.department}-${entry.year}-${entry.section}-${entry.subject}`;
                if (!classMap.has(key)) {
                    const students: StudentInfo[] = Array.from<StudentInfo>(studentDirectory.values()).filter(s => 
                        s.department === entry.department && s.year === entry.year && s.section === entry.section
                    );
                    classMap.set(key, {
                        entry: entry,
                        studentsCount: students.length,
                        schedule: []
                    });
                }
                
                const classDetails = classMap.get(key);
                if (classDetails) {
                    classDetails.schedule.push({ day: days[entry.dayOfWeek - 1], time: entry.startTime });
                    classDetails.schedule.sort((a,b) => days.indexOf(a.day) - days.indexOf(b.day) || a.time.localeCompare(b.time));
                }
            }
        });
        return Array.from(classMap.values());
    }, [timeTable, currentUser.idNumber, studentDirectory]);

    if (uniqueClasses.length === 0) {
        return (
            <div className="text-center p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                <p className="text-lg text-gray-500 dark:text-gray-400">You are not assigned to any classes in the timetable.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {uniqueClasses.map(({ entry, studentsCount, schedule }) => (
                <div key={entry.id} className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h4 className="font-bold text-lg text-gray-900 dark:text-white">{entry.subject}</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">{entry.department} / {entry.year} / Sec {entry.section}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Students: {studentsCount}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Weekly Schedule:</p>
                        <div className="flex flex-wrap gap-2">
                            {schedule.map(s => (
                                <span key={`${s.day}-${s.time}`} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">{s.day} at {s.time}</span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


export const TeacherDashboard: React.FC<TeacherDashboardProps> = (props) => {
    const { currentUser, studentDirectory, attendance, faceLinks, timeTable, onLogout, onStartAnalyzer, onNavigateToSettings, onSetManualAttendance, leaveRecords, onRequestLeave, onCancelOwnLeave, onToggleAdminPresence, notifications, onMarkNotificationAsRead, onMarkAllNotificationsAsRead, onQueryKnowledgeBase } = props;
    
    const [now, setNow] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'schedule' | 'marks' | 'leave' | 'messages' | 'report' | 'knowledge'>('schedule');
    const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30000); // Update every 30 seconds
        return () => clearInterval(timer);
    }, []);

    const { currentClass, upcomingClasses, completedClasses } = useMemo(() => {
        const dayOfWeek = now.getDay();
        const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        const todaysSchedule = timeTable
            .filter(e => e.teacherId === currentUser.idNumber && (e.dayOfWeek === adjustedDay))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

        let current: TimeTableEntry | null = null;
        const upcoming: TimeTableEntry[] = [];
        const completed: TimeTableEntry[] = [];

        todaysSchedule.forEach(entry => {
            if (!entry.isCancelled && entry.startTime <= currentTime && entry.endTime > currentTime) {
                current = entry;
            } else if (entry.startTime > currentTime) {
                upcoming.push(entry);
            } else {
                completed.push(entry);
            }
        });

        return {
            currentClass: current,
            upcomingClasses: upcoming,
            completedClasses: completed,
        };
    }, [now, timeTable, currentUser.idNumber]);

    const getStudentsForClass = (entry: TimeTableEntry): StudentInfo[] => {
        return Array.from<StudentInfo>(studentDirectory.values()).filter(student => 
            student.department === entry.department &&
            student.year === entry.year &&
            student.section === entry.section
        );
    };

    const rosterProps = {
        attendance,
        faceLinks,
        onSetManualAttendance,
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-slide-up p-4 sm:p-6 lg:p-8">
            <header className="mb-6 w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    {currentUser.photoBase64 ? (
                        <img src={currentUser.photoBase64} alt={currentUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600" />
                    ) : (
                         <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-14 h-14 rounded-full" />
                    )}
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Teacher Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome, {currentUser.name} ({currentUser.designation})</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell
                        notifications={notifications}
                        onMarkAsRead={onMarkNotificationAsRead}
                        onMarkAllAsRead={onMarkAllNotificationsAsRead}
                    />
                    <div className="flex items-center gap-2 mr-2">
                        <span className={`text-sm font-semibold ${currentUser.isPresentToday ?? true ? 'text-green-400' : 'text-red-400'}`}>
                            {currentUser.isPresentToday ?? true ? 'Available' : 'Unavailable'}
                        </span>
                        <ToggleSwitch
                            checked={currentUser.isPresentToday ?? true}
                            onChange={() => onToggleAdminPresence(currentUser.idNumber)}
                        />
                    </div>
                    <button 
                        onClick={onNavigateToSettings}
                        onMouseMove={handleMouseMove}
                        className="btn-animated px-4 py-2 rounded-lg font-semibold text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-700 transition-all"
                    >
                         <span className="btn-content">
                            <span className="btn-dot"></span>
                            <span>Settings</span>
                        </span>
                    </button>
                    <button 
                        onClick={onLogout} 
                        onMouseMove={handleMouseMove}
                        className="btn-animated px-4 py-2 rounded-lg font-semibold text-white bg-rose-600 transition-all"
                    >
                        <span className="btn-content">
                            <span className="btn-dot"></span>
                            <span>Logout</span>
                        </span>
                    </button>
                </div>
            </header>
            
            <main className="w-full">
                <div className="mb-6">
                    <nav className="flex space-x-2 sm:space-x-4 bg-gray-100 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar" aria-label="Tabs">
                        <button onClick={() => setActiveTab('schedule')} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === 'schedule' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>
                            Today's Schedule
                        </button>
                         <button onClick={() => setActiveTab('knowledge')} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === 'knowledge' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>
                            Knowledge Base
                        </button>
                         <button onClick={() => setActiveTab('report')} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>
                            My Report
                        </button>
                        <button onClick={() => setActiveTab('marks')} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === 'marks' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>
                            Mid-Term Assessment
                        </button>
                        <button onClick={() => setActiveTab('leave')} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === 'leave' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>
                            My Leave
                        </button>
                         <button onClick={() => setActiveTab('messages')} className={`flex-1 sm:flex-none justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === 'messages' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700/50'}`}>
                            Communications
                        </button>
                    </nav>
                </div>

                {activeTab === 'schedule' && (
                    <div className="space-y-6">
                        {currentClass && (
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Current Class</h3>
                                <div className="flex items-stretch gap-4">
                                    <div className="flex-grow">
                                        <ClassEntryCard
                                            entry={currentClass}
                                            isCurrent={true}
                                            isPast={false}
                                            students={getStudentsForClass(currentClass)}
                                            expandedClassId={expandedClassId}
                                            onExpand={setExpandedClassId}
                                            rosterProps={rosterProps}
                                        />
                                    </div>
                                    <button 
                                        onClick={() => onStartAnalyzer(currentClass.subject)}
                                        className="px-4 py-8 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex flex-col items-center justify-center gap-2 shadow-lg"
                                        title={`Start Attendance Analyzer for ${currentClass.subject}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.522 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" /></svg>
                                        <span className="text-sm">Start Analyzer</span>
                                    </button>
                                </div>
                            </div>
                        )}
                        {upcomingClasses.length > 0 && (
                             <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Upcoming Classes</h3>
                                <div className="space-y-3">
                                    {upcomingClasses.map(entry => (
                                        <ClassEntryCard
                                            key={entry.id}
                                            entry={entry}
                                            isCurrent={false}
                                            isPast={false}
                                            students={getStudentsForClass(entry)}
                                            expandedClassId={expandedClassId}
                                            onExpand={setExpandedClassId}
                                            rosterProps={rosterProps}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {completedClasses.length > 0 && (
                             <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Completed Classes</h3>
                                <div className="space-y-3">
                                    {completedClasses.map(entry => (
                                        <ClassEntryCard
                                            key={entry.id}
                                            entry={entry}
                                            isCurrent={false}
                                            isPast={true}
                                            students={getStudentsForClass(entry)}
                                            expandedClassId={expandedClassId}
                                            onExpand={setExpandedClassId}
                                            rosterProps={rosterProps}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                        {!currentClass && upcomingClasses.length === 0 && completedClasses.length > 0 && (
                            <div className="text-center p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                                <p className="text-lg text-gray-500 dark:text-gray-400">All classes for today are completed.</p>
                            </div>
                        )}
                         {!currentClass && upcomingClasses.length === 0 && completedClasses.length === 0 && (
                            <div className="text-center p-8 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
                                <p className="text-lg text-gray-500 dark:text-gray-400">You have no classes scheduled for today.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'knowledge' && (
                    <RAGKnowledgeBasePanel onQuery={onQueryKnowledgeBase} />
                )}

                {activeTab === 'report' && (
                    <TeacherReportPanel 
                        currentUser={currentUser} 
                        timeTable={timeTable} 
                        studentDirectory={studentDirectory} 
                    />
                )}
                {activeTab === 'marks' && (
                    <MidTermAssessment
                        currentUser={currentUser}
                        studentDirectory={studentDirectory}
                        departments={props.departments}
                        onSaveMarks={props.onUpdateMarks}
                        onLogAction={props.onLogAction}
                    />
                )}
                {activeTab === 'leave' && (
                    <MyLeavePanel
                        currentUser={currentUser}
                        leaveRecords={leaveRecords}
                        onRequestLeave={onRequestLeave}
                        onCancelOwnLeave={onCancelOwnLeave}
                    />
                )}
                {activeTab === 'messages' && (
                    <CommunicationPanel
                        currentUser={{ ...currentUser, userType: 'ADMIN' }}
                        conversations={props.conversations}
                        onSendMessage={props.onSendMessage}
                        studentDirectory={studentDirectory}
                        adminDirectory={props.adminDirectory}
                        timeTable={timeTable}
                        onQueryKnowledgeBase={onQueryKnowledgeBase}
                    />
                )}
            </main>
        </div>
    );
};