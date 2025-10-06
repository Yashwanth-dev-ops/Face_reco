import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StudentInfo, AdminInfo, AttendanceRecord, Emotion, MidTermMarks, TimeTableEntry, Conversation, Holiday, StudyGroup, SharedNote, GroupTask, MarkPrediction, Notification, GroupEvent, KnowledgeDocument } from '../types';
import { emotionUIConfig } from './uiConfig';
import { detectSingleFaceEmotion } from '../services/geminiService';
import { AttendanceStatusPanel } from './AttendanceStatusPanel';
import { AttendanceCaptureModal } from './AttendanceCaptureModal';
import { AttendanceCalendar } from './AttendanceCalendar';
import { DonutChart } from './DonutChart';
import { EditProfileModal } from './EditProfileModal';
import { AIAcademicAdvisorPanel } from './AIAcademicAdvisorPanel';
import { TeacherAvailabilityPanel } from './TeacherAvailabilityPanel';
import { CommunicationPanel } from './CommunicationPanel';
import { AITutorModal } from './AITutorModal';
import { SparklesIcon } from './SparklesIcon';
import { MyMarksPanel } from './MyMarksPanel';
import { CommunityPanel } from './CommunityPanel';
import { MarkPredictionPanel } from './MarkPredictionPanel';
import { NotificationBell } from './NotificationBell';
import { RAGKnowledgeBasePanel } from './RAGKnowledgeBasePanel';

interface StudentDashboardProps {
    currentUser: StudentInfo;
    attendance: AttendanceRecord[];
    faceLinks: Map<number, string>;
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
    timeTable: TimeTableEntry[];
    conversations: Conversation[];
    holidays: Holiday[];
    studyGroups: StudyGroup[];
    sharedNotes: SharedNote[];
    notifications: Notification[];
    onSendMessage: (receiverId: string, content: string, file?: { name: string; url: string }, isPriority?: boolean) => Promise<void>;
    onLogout: () => void;
    onLogAttendance: (persistentId: number, emotion: Emotion, subject?: string) => void;
    onLinkFace: () => Promise<void>;
    onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
    onNavigateToSettings: () => void;
    onCreateStudyGroup: (groupData: Omit<StudyGroup, 'id' | 'events' | 'messages'>) => Promise<void>;
    onJoinStudyGroup: (groupId: string) => Promise<void>;
    onDeclineStudyGroupInvitation: (groupId: string) => Promise<void>;
    onSendGroupMessage: (groupId: string, content: string, file?: { name: string; url: string }, audio?: { url: string; duration: number }, replyToMessageId?: string) => Promise<void>;
    onDeleteGroupMessage: (groupId: string, messageId: string, deleteType: 'me' | 'everyone') => Promise<void>;
    onDeleteGroupResource: (groupId: string, resourceId: string) => Promise<void>;
    onUploadNote: (noteData: Omit<SharedNote, 'id' | 'ratings' | 'createdAt'>) => Promise<void>;
    onRateNote: (noteId: string, rating: number) => Promise<void>;
    onSuggestStudyTime: (groupId: string) => Promise<{ dayOfWeek: number, startTime: string, reason: string }[]>;
    onSummarizeNote: (noteId: string) => Promise<string>;
    onPinMessage: (groupId: string, messageId: string) => Promise<void>;
    onAddTask: (groupId: string, task: Omit<GroupTask, 'id' | 'completed'>) => Promise<void>;
    onToggleTask: (groupId: string, taskId: string) => Promise<void>;
    onDeleteStudyGroup: (groupId: string) => Promise<void>;
    onAddMemberToGroup: (groupId: string, studentRollNumber: string) => Promise<void>;
    onPlacePrediction: (subject: string, midTerm: 'mid1' | 'mid2', predictedMarks: number) => Promise<void>;
    onClaimReward: (subject: string, midTerm: 'mid1' | 'mid2') => Promise<void>;
    onMarkNotificationAsRead: (notificationId: string) => void;
    onMarkAllNotificationsAsRead: () => void;
    onScheduleEvent: (groupId: string, eventData: Omit<GroupEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (groupId: string, eventId: string) => Promise<void>;
    onQueryKnowledgeBase: (query: string) => Promise<{ answer: string; sources: KnowledgeDocument[] }>;
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'BLOCKED' | 'UNLINKED';
type NextClassInfo = { entry: TimeTableEntry; timeToClass: number };
type Tab = 'dashboard' | 'marks' | 'community' | 'messages' | 'advisor' | 'knowledge';

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

export const StudentDashboard: React.FC<StudentDashboardProps> = (props) => {
    const {
        currentUser, attendance, faceLinks, studentDirectory, adminDirectory,
        timeTable, conversations, holidays, studyGroups, sharedNotes, notifications,
        onSendMessage, onLogout, onLogAttendance, onLinkFace, onNavigateToSettings,
        onMarkNotificationAsRead, onMarkAllNotificationsAsRead,
        onQueryKnowledgeBase
    } = props;

    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [isAITutorModalOpen, setIsAITutorModalOpen] = useState(false);
    const [tutorSubject, setTutorSubject] = useState('');

    const myPersistentId = useMemo(() => {
        return Array.from(faceLinks.entries()).find(([, roll]) => roll === currentUser.rollNumber)?.[0];
    }, [faceLinks, currentUser.rollNumber]);

    const attendanceStatus = useMemo((): AttendanceStatus => {
        if (currentUser.blockExpiresAt && currentUser.blockExpiresAt > Date.now()) return 'BLOCKED';
        if (myPersistentId === undefined) return 'UNLINKED';
        const today = new Date().toDateString();
        const hasAttendedToday = attendance.some(rec => rec.persistentId === myPersistentId && new Date(rec.timestamp).toDateString() === today);
        return hasAttendedToday ? 'PRESENT' : 'ABSENT';
    }, [currentUser, myPersistentId, attendance]);

    const lastLogTime = useMemo(() => {
        if (attendanceStatus !== 'PRESENT' || myPersistentId === undefined) return null;
        const todayLogs = attendance
            .filter(rec => rec.persistentId === myPersistentId && new Date(rec.timestamp).toDateString() === new Date().toDateString())
            .sort((a, b) => b.timestamp - a.timestamp);
        return todayLogs.length > 0 ? new Date(todayLogs[0].timestamp) : null;
    }, [attendance, myPersistentId, attendanceStatus]);
    
    const blockedByAdminName = useMemo(() => {
        if (!currentUser.blockedBy) return 'an Administrator';
        return adminDirectory.get(currentUser.blockedBy)?.name || 'an Administrator';
    }, [currentUser.blockedBy, adminDirectory]);

    const studentAttendance = useMemo(() => attendance.filter(rec => rec.persistentId === myPersistentId), [attendance, myPersistentId]);
    
    const handleMarkAttendance = async (base64Data: string) => {
        if (myPersistentId === undefined) {
            throw new Error("Face ID not linked to your account.");
        }
        const result = await detectSingleFaceEmotion(base64Data);
        const emotion = result ? result.emotion : Emotion.Neutral;
        onLogAttendance(myPersistentId, emotion, undefined);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'marks':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MyMarksPanel marks={currentUser.marks || []} predictions={currentUser.predictions} />
                        <MarkPredictionPanel currentUser={currentUser} onPlacePrediction={props.onPlacePrediction} onClaimReward={props.onClaimReward} />
                    </div>
                );
            case 'community':
                return <CommunityPanel {...props} />;
            case 'messages':
                return <CommunicationPanel currentUser={{ ...currentUser, userType: 'STUDENT' }} conversations={conversations} onSendMessage={onSendMessage} studentDirectory={studentDirectory} adminDirectory={adminDirectory} timeTable={timeTable} onQueryKnowledgeBase={onQueryKnowledgeBase} />;
            case 'advisor':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AIAcademicAdvisorPanel currentUser={currentUser} attendance={studentAttendance} timeTable={timeTable} />
                        <TeacherAvailabilityPanel student={currentUser} timeTable={timeTable} adminDirectory={adminDirectory} />
                    </div>
                );
            case 'knowledge':
                return <RAGKnowledgeBasePanel onQuery={onQueryKnowledgeBase} />;
            case 'dashboard':
            default:
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AttendanceStatusPanel status={attendanceStatus} onMarkAttendanceClick={() => setIsCaptureModalOpen(true)} onLinkFaceClick={onLinkFace} lastLogTime={lastLogTime} blockedByAdminName={blockedByAdminName} blockExpiresAt={currentUser.blockExpiresAt} />
                        <AttendanceCalendar studentAttendance={studentAttendance} />
                    </div>
                );
        }
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-slide-up p-4 sm:p-6 lg:p-8">
            {isCaptureModalOpen && (
                <AttendanceCaptureModal
                    onClose={() => setIsCaptureModalOpen(false)}
                    onCapture={handleMarkAttendance}
                    title="Mark Daily Attendance"
                    actionText="Mark Present"
                />
            )}
            {isAITutorModalOpen && (
                <AITutorModal subject={tutorSubject} onClose={() => setIsAITutorModalOpen(false)} />
            )}
            <header className="mb-6 w-full flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <img src={currentUser.photoBase64 || "https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png"} alt={currentUser.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-600" />
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">Student Dashboard</h1>
                        <p className="text-sm text-gray-400">Welcome, {currentUser.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell notifications={notifications} onMarkAsRead={onMarkNotificationAsRead} onMarkAllAsRead={onMarkAllNotificationsAsRead} />
                    <button onClick={onNavigateToSettings} className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-all">Settings</button>
                    <button onClick={onLogout} className="px-4 py-2 rounded-lg font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-all">Logout</button>
                </div>
            </header>

            <main className="w-full">
                <div className="mb-6">
                    <nav className="flex space-x-2 sm:space-x-4 bg-gray-800/50 p-2 rounded-xl border border-gray-700 overflow-x-auto no-scrollbar">
                        { (Object.keys({dashboard:0, marks:0, community:0, messages:0, advisor:0, knowledge:0}) as Tab[]).map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 sm:flex-none capitalize justify-center whitespace-nowrap py-2 px-4 font-medium text-sm sm:text-base rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>
                {renderTabContent()}
            </main>
        </div>
    );
};
