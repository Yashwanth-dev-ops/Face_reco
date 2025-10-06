

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { detectFacesAndHands } from './services/geminiService';
import { exportAttendanceToCSV } from './services/csvExportService';
import * as apiService from './services/apiService';
import * as emailService from './services/emailService';
import { MarkUpdate } from './services/apiService';
// Fix: Import MediaSettingsRange for camera focus capabilities.
import { DetectionResult, FaceResult, BoundingBox, StudentInfo, AdminInfo, AttendanceRecord, Emotion, Year, Designation, PasswordResetToken, SimulatedEmail, Theme, MediaSettingsRange, TimeTableEntry, LeaveRecord, Conversation, Holiday, StudyGroup, SharedNote, AttendanceAnomaly, GroupTask, Notification, Toast, GroupEvent, KnowledgeDocument } from './types';
import { CameraIcon } from './components/CameraIcon';
import { DetectionOverlay } from './components/DetectionOverlay';
import { WelcomeScreen } from './components/WelcomeScreen';
import { DetectionSummary } from './components/DetectionSummary';
import { RegistrationModal } from './components/RegistrationModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
// Fix: Update import for StudentDashboard to use the barrel file, which resolves the module resolution error.
import { StudentDashboard } from './StudentDashboard';
import { VerificationScreen } from './components/VerificationScreen';
import { ForgotPasswordScreen } from './components/ForgotPasswordScreen';
import { ResetPasswordScreen } from './components/ResetPasswordScreen';
import { MockInbox } from './components/MockInbox';
import { SettingsScreen } from './components/SettingsScreen';
import { OnboardingScreen } from './components/OnboardingScreen';
import { BlockedScreen } from './components/BlockedScreen';
import { FocusControls } from './components/FocusControls';
import { StudentRegistrationScreen } from './components/StudentRegistrationScreen';
import { AdminRegistrationScreen } from './components/AdminRegistrationScreen';
import { HolidayManagementScreen } from './components/HolidayManagementPanel';
import { AIChatbot } from './components/AIChatbot';
import { ToastContainer } from './components/ToastContainer';
import { RAGKnowledgeBasePanel } from './components/RAGKnowledgeBasePanel';


type View = 'LOGIN' | 'STUDENT_REGISTRATION' | 'ADMIN_REGISTRATION' | 'ADMIN_DASHBOARD' | 'TEACHER_DASHBOARD' | 'STUDENT_DASHBOARD' | 'ANALYZER' | 'VERIFY_ACCOUNT' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD' | 'SETTINGS' | 'ONBOARDING' | 'BLOCKED' | 'HOLIDAY_MANAGEMENT';
type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });
type TrackedFace = {
    boundingBox: BoundingBox;
    velocity: { x: number; y: number };
    lastSeen: number;
    geminiId: string;
    consecutiveMisses: number;
};
type UserToVerify = {
    identifier: string; // rollNumber or idNumber
    userType: 'STUDENT' | 'ADMIN';
}
type UserToResetPassword = {
    identifier: string; // email
    token: string;
}
type BlockedInfo = {
    adminName: string;
    expiresAt: number | null;
}
type FocusCapabilities = {
    focusMode?: string[];
    focusDistance?: MediaSettingsRange;
};
type AnalyzerContext = {
    subject: string;
};

const calculateIoU = (boxA: BoundingBox, boxB: BoundingBox): number => {
    const xA = Math.max(boxA.x, boxB.x);
    const yA = Math.max(boxA.y, boxB.y);
    const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);
    const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    const boxAArea = boxA.width * boxA.height;
    const boxBArea = boxB.width * boxB.height;
    if (boxAArea <= 0 || boxBArea <= 0) return 0;
    const unionArea = boxAArea + boxBArea - intersectionArea;
    const iou = intersectionArea / unionArea;
    return isNaN(iou) ? 0 : iou;
};

const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
};

const App: React.FC = () => {
    // App state
    const [view, setView] = useState<View>('LOGIN');
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [detectionResult, setDetectionResult] = useState<DetectionResult>({ faces: [], hands: [] });
    const [error, setError] = useState<{title: string, message: string} | null>(null);
    const [isApiError, setIsApiError] = useState(false);
    const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
    const [isPausedForRateLimit, setIsPausedForRateLimit] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userToVerify, setUserToVerify] = useState<UserToVerify | null>(null);
    const [userToResetPassword, setUserToResetPassword] = useState<UserToResetPassword | null>(null);
    const [simulatedEmails, setSimulatedEmails] = useState<SimulatedEmail[]>([]);
    const [theme, setTheme] = useState<Theme>('dark');
    const [blockedInfo, setBlockedInfo] = useState<BlockedInfo | null>(null);
    const [analyzerContext, setAnalyzerContext] = useState<AnalyzerContext | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Camera Focus State
    const [focusCapabilities, setFocusCapabilities] = useState<FocusCapabilities | null>(null);
    const [isAutoFocus, setIsAutoFocus] = useState(true);
    const [manualFocusValue, setManualFocusValue] = useState(0);
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; focusing: boolean } | null>(null);

    // Data state
    const [studentDirectory, setStudentDirectory] = useState<Map<string, StudentInfo>>(new Map());
    const [adminDirectory, setAdminDirectory] = useState<Map<string, AdminInfo>>(new Map());
    const [faceLinks, setFaceLinks] = useState<Map<number, string>>(new Map());
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [registrationTarget, setRegistrationTarget] = useState<FaceResult | null>(null);
    const [timeTable, setTimeTable] = useState<TimeTableEntry[]>([]);
    const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [studyGroups, setStudyGroups] = useState<StudyGroup[]>([]);
    const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
    const lastAttendanceLogRef = useRef<Map<number, number>>(new Map());

    // Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isProcessing = useRef(false);
    const trackedFacesRef = useRef<Map<number, TrackedFace>>(new Map());
    const nextFaceIdRef = useRef(1);
    
    // Constants
    const ANALYSIS_INTERVAL = 2000;
    const RATE_LIMIT_PAUSE_MS = 61000;
    const ATTENDANCE_LOG_INTERVAL_MS = 5 * 60 * 1000;

    // Toast management functions
    const addToast = (toast: Omit<Toast, 'id'>) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev, { id, ...toast }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };
    
    // Set up email listener
    useEffect(() => {
        emailService.setEmailListener((email) => {
            // Add new email to the top, and keep only the last 5
            setSimulatedEmails(prev => [email, ...prev.slice(0, 4)]);
        });

        // Set up notification listener for real-time updates and toasts
        apiService.setNotificationListener((notification) => {
             const currentUserId = currentUser 
                ? (currentUser.userType === 'STUDENT' ? currentUser.rollNumber : currentUser.idNumber)
                : null;
            
            // Only process notifications intended for the current user
            if (notification.recipientId === currentUserId) {
                // Show a toast if the notification is not from themselves
                if (notification.senderId !== currentUserId) {
                    addToast({
                        title: notification.title,
                        message: notification.message,
                        type: 'info',
                    });
                }
                // Add the new notification to the state
                setNotifications(prev => [notification, ...prev].sort((a,b) => b.timestamp - a.timestamp));
            }
        });
    }, [currentUser]);
    
     // Apply theme and load from storage
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') as Theme | null;
        if (storedTheme) {
            setTheme(storedTheme);
        }
    }, []);

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Load all static data from API service on initial render
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const [students, admins, links, attend, depts, tt, leaves, hols, groups, notes] = await Promise.all([
                    apiService.getStudentDirectory(),
                    apiService.getAdminDirectory(),
                    apiService.getFaceLinks(),
                    apiService.getAttendance(),
                    apiService.getDepartments(),
                    apiService.getTimeTable(),
                    apiService.getLeaveRecords(),
                    apiService.getHolidays(),
                    apiService.getStudyGroups(),
                    apiService.getSharedNotes(),
                ]);
                setStudentDirectory(students);
                setAdminDirectory(admins);
                setFaceLinks(links);
                setAttendance(attend);
                setDepartments(depts);
                setTimeTable(tt);
                setLeaveRecords(leaves);
                setHolidays(hols);
                setStudyGroups(groups);
                setSharedNotes(notes);
            } catch (err) {
                console.error("Failed to load initial data", err);
                setError({ title: "Loading Error", message: "Could not load application data." });
            } finally {
                setIsLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Load user-specific data (like conversations) when user logs in or out
    useEffect(() => {
        const loadUserData = async () => {
            if (currentUser) {
                try {
                    const [convos, notifs] = await Promise.all([
                        apiService.getConversations(
                            currentUser.userType === 'STUDENT' ? currentUser.rollNumber : currentUser.idNumber,
                            currentUser.userType,
                            currentUser.userType === 'ADMIN' ? currentUser.designation : undefined,
                            currentUser.userType === 'ADMIN' ? currentUser.department : undefined
                        ),
                        apiService.getNotificationsForUser(currentUser)
                    ]);
                    setConversations(convos);
                    setNotifications(notifs);
                } catch (err) {
                     console.error("Failed to load user data:", err);
                     setError({ title: "User Data Error", message: "Could not load your conversations or notifications." });
                }
            } else {
                setConversations([]); // Clear on logout
                setNotifications([]); // Clear on logout
            }
        };
        loadUserData();
    }, [currentUser]);


    const handleLogin = async (user: CurrentUser) => {
        let finalUser: CurrentUser = user;
        if (user.userType === 'ADMIN') {
            try {
                const { updatedAdmin, updatedTimeTable } = await apiService.resetAdminPresenceOnLogin(user.idNumber);
                finalUser = { ...updatedAdmin, userType: 'ADMIN' };
                setAdminDirectory(prev => new Map(prev).set(updatedAdmin.idNumber, updatedAdmin));
                setTimeTable(updatedTimeTable);
            } catch (err) {
                console.error("Failed to reset admin presence on login:", err);
                // Fallback to original user if reset fails
            }
        }
    
        setCurrentUser(finalUser); // Set user state here for both types
    
        if (finalUser.userType === 'ADMIN') {
            if (finalUser.designation === Designation.Teacher || finalUser.designation === Designation.Incharge) {
                setView('TEACHER_DASHBOARD');
            } else {
                setView('ADMIN_DASHBOARD');
            }
        } else { // Student
             if (!(finalUser as StudentInfo).onboarded) {
                setView('ONBOARDING');
            } else {
                setView('STUDENT_DASHBOARD');
            }
        }
    };

    const handleBlockedLogin = async (blockDetails: { blockedBy: string | null; expiresAt: number | null }) => {
        const admin = blockDetails.blockedBy ? adminDirectory.get(blockDetails.blockedBy) : null;
        const adminName = admin ? `${admin.name} (${admin.designation})` : 'an Administrator';
        
        setBlockedInfo({
            adminName: adminName,
            expiresAt: blockDetails.expiresAt,
        });
        setView('BLOCKED');
    };
    
    const handleLogout = () => {
        handleStopCamera();
        setCurrentUser(null);
        setView('LOGIN');
    };
    
    const handleStudentRegister = async (student: Omit<StudentInfo, 'blockExpiresAt' | 'isVerified' | 'blockedBy' | 'onboarded' | 'marks' | 'predictions'>): Promise<void> => {
        const newStudent = await apiService.registerStudent(student);
        setStudentDirectory(prev => new Map(prev).set(newStudent.rollNumber, newStudent));
        setUserToVerify({
            identifier: newStudent.rollNumber,
            userType: 'STUDENT',
        });
        setView('VERIFY_ACCOUNT');
    };
    
    const handleBulkRegister = async (studentsData: Omit<StudentInfo, 'blockExpiresAt' | 'isVerified' | 'password' | 'blockedBy' | 'onboarded' | 'marks' | 'predictions'>[], adminId: string) => {
        const result = await apiService.registerStudentsBulk(studentsData, adminId);
        
        if (result.successful.length > 0) {
            setStudentDirectory(prev => {
                const newDirectory = new Map(prev);
                result.successful.forEach(student => {
                    newDirectory.set(student.rollNumber, student);
                });
                return newDirectory;
            });
        }
        
        return result; // Pass the full result back to the component
    };

    const handleAdminRegister = async (admin: Omit<AdminInfo, 'isVerified' | 'isBlocked'>): Promise<void> => {
        const { newAdmin, updatedDepartments } = await apiService.registerAdmin(admin);
        setAdminDirectory(prev => new Map(prev).set(newAdmin.idNumber, newAdmin));
        setDepartments(updatedDepartments);
        setUserToVerify({
            identifier: newAdmin.idNumber,
            userType: 'ADMIN',
        });
        setView('VERIFY_ACCOUNT');
    };
    
    const handleRequestPasswordReset = async (email: string): Promise<void> => {
        const resetToken: PasswordResetToken = await apiService.requestPasswordReset(email);
        setUserToResetPassword({
            identifier: email,
            token: resetToken.token,
        });
        setView('RESET_PASSWORD');
    };
    
    const handleResetPassword = async (newPassword: string): Promise<void> => {
        if (!userToResetPassword) {
            throw new Error("No password reset process is active.");
        }
        await apiService.resetPassword(userToResetPassword.token, newPassword);
        // On success, reset state and go to login
        setUserToResetPassword(null);
        setView('LOGIN');
    };

    const handleChangePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
        if (!currentUser) throw new Error("No user is logged in.");

        const { updatedUser, userType } = await apiService.changePassword(
            currentUser.userType === 'ADMIN' ? currentUser.idNumber : currentUser.rollNumber,
            currentUser.userType,
            currentPassword,
            newPassword
        );
        
        if (userType === 'ADMIN') {
            setAdminDirectory(prev => new Map(prev).set((updatedUser as AdminInfo).idNumber, updatedUser as AdminInfo));
            setCurrentUser({ ...(updatedUser as AdminInfo), userType });
        } else {
            setStudentDirectory(prev => new Map(prev).set((updatedUser as StudentInfo).rollNumber, updatedUser as StudentInfo));
            setCurrentUser({ ...(updatedUser as StudentInfo), userType });
        }
    };
    
    const handleDeleteSelf = async (password: string): Promise<void> => {
        if (!currentUser) throw new Error("No user is logged in.");
        
        const { updatedStudents, updatedAdmins, updatedFaceLinks, updatedAttendance } = await apiService.deleteSelf(
            currentUser.userType === 'ADMIN' ? currentUser.idNumber : currentUser.rollNumber,
            currentUser.userType,
            password
        );
        
        setStudentDirectory(updatedStudents);
        setAdminDirectory(updatedAdmins);
        setFaceLinks(updatedFaceLinks);
        setAttendance(updatedAttendance);
        
        handleLogout();
    };

    const handleCompleteStudentOnboarding = async (photoBase64: string, newPassword: string): Promise<void> => {
        if (currentUser?.userType !== 'STUDENT') throw new Error("No student is logged in for onboarding.");
        
        const updatedStudent = await apiService.completeStudentOnboarding(currentUser.rollNumber, photoBase64, newPassword);
        
        setStudentDirectory(prev => new Map(prev).set(updatedStudent.rollNumber, updatedStudent));
        setCurrentUser({ ...updatedStudent, userType: 'STUDENT' });
        setView('STUDENT_DASHBOARD');
    };

    const handleStartAnalyzerWithContext = (subject: string) => {
        setAnalyzerContext({ subject });
        setView('ANALYZER');
    };

    const handleStartCamera = async () => {
        setError(null);
        setIsPausedForRateLimit(false);
        setDetectionResult({ faces: [], hands: [] });
        trackedFacesRef.current.clear();

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError({ title: "Unsupported Browser", message: "Your browser does not support camera access." });
                return;
            }

            if (navigator.permissions && navigator.permissions.query) {
                const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
                if (permission.state === 'denied') {
                    setError({
                        title: "Camera Permission Denied",
                        message: "Camera access is blocked. Please go to your browser settings to allow camera access for this site."
                    });
                    return;
                }
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
            if (videoRef.current) videoRef.current.srcObject = mediaStream;

            // Check for focus capabilities
            const track = mediaStream.getVideoTracks()[0];
            if ('getCapabilities' in track) {
                const capabilities = track.getCapabilities();
                // FIX: Cast focusMode and focusDistance to their expected types, as they are experimental and may not be fully typed.
                if ('focusMode' in capabilities && 'focusDistance' in capabilities && capabilities.focusDistance) {
                    const focusMode = capabilities.focusMode as string[];
                    const focusDistance = capabilities.focusDistance as MediaSettingsRange;
                    setFocusCapabilities({
                        focusMode: focusMode,
                        focusDistance: focusDistance,
                    });
                    setManualFocusValue((focusDistance.min + focusDistance.max) / 2);
                    if (focusMode?.includes('continuous')) {
                        // FIX: Use 'as any' to apply the experimental focusMode constraint which is not in the standard MediaTrackConstraintSet type.
                        track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] });
                    }
                }
            }

        } catch (err) {
            console.error("Error accessing camera:", err);
            let title = "Camera Error";
            let message = "An unexpected error occurred while trying to access the camera.";
            if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError') {
                    title = "Camera Permission Denied";
                    message = "You denied camera access. Please allow camera access in your browser settings to continue.";
                } else if (err.name === 'NotFoundError') {
                    title = "No Camera Found";
                    message = "No camera was found on your device. Please ensure a camera is connected.";
                } else if (err.name === 'NotReadableError') {
                    title = "Camera in Use";
                    message = "Your camera might be in use by another application. Please close other apps and try again.";
                }
            }
            setError({ title, message });
        }
    };

    const handleStopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setDetectionResult({ faces: [], hands: [] });
            setVideoDimensions({ width: 0, height: 0 });
            trackedFacesRef.current.clear();
            setIsPausedForRateLimit(false);
            setFocusCapabilities(null);
            setFocusPoint(null);
            setAnalyzerContext(null); // Clear context on stop
        }
    };
    
    const handleRegisterStudentFace = (face: FaceResult) => setRegistrationTarget(face);

    const handleLinkFaceToStudent = async (persistentId: number, rollNumber: string) => {
        const newLinks = await apiService.linkFaceToStudent(persistentId, rollNumber);
        setFaceLinks(newLinks);
        setRegistrationTarget(null);
    };
    
    const handleStudentSelfLinkFace = async (rollNumber: string) => {
        try {
            const newLinks = await apiService.linkNewFaceForStudent(rollNumber);
            setFaceLinks(newLinks);
        } catch (err) {
            console.error("Failed to link face:", err);
            throw err;
        }
    };
    
    const handleDeleteStudent = async (rollNumber: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const { updatedStudents, updatedFaceLinks, updatedAttendance } = await apiService.deleteStudent(rollNumber, currentUser.idNumber);
        setStudentDirectory(updatedStudents);
        setFaceLinks(updatedFaceLinks);
        setAttendance(updatedAttendance);
    };

    const handleDeleteStudents = async (rollNumbers: string[]) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const { updatedStudents, updatedFaceLinks, updatedAttendance } = await apiService.deleteStudents(rollNumbers, currentUser.idNumber);
        setStudentDirectory(updatedStudents);
        setFaceLinks(updatedFaceLinks);
        setAttendance(updatedAttendance);
    };
    
    const handleBlockStudent = async (rollNumber: string, durationMs: number | 'PERMANENT') => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedStudent = await apiService.blockStudent(rollNumber, currentUser.idNumber, durationMs);
        setStudentDirectory(prev => new Map(prev).set(rollNumber, updatedStudent));
    };

    const handleBlockStudents = async (rollNumbers: string[], durationMs: number | 'PERMANENT') => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedStudents = await apiService.blockStudents(rollNumbers, currentUser.idNumber, durationMs);
        setStudentDirectory(updatedStudents);
    };

    const handleUnblockStudent = async (rollNumber: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedStudent = await apiService.unblockStudent(rollNumber, currentUser.idNumber);
        setStudentDirectory(prev => new Map(prev).set(rollNumber, updatedStudent));
    };

    const handleUnblockStudents = async (rollNumbers: string[]) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedStudents = await apiService.unblockStudents(rollNumbers, currentUser.idNumber);
        setStudentDirectory(updatedStudents);
    };
    
    const handleDeleteAdmin = async (idNumber: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        try {
            const updatedAdmins = await apiService.deleteAdmin(idNumber, currentUser.idNumber);
            setAdminDirectory(updatedAdmins);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleDeleteAdmins = async (idNumbers: string[]) => {
        if (currentUser?.userType !== 'ADMIN') return;
        try {
            const updatedAdmins = await apiService.deleteAdmins(idNumbers, currentUser.idNumber);
            setAdminDirectory(updatedAdmins);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleToggleBlockAdmin = async (idNumber: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        try {
            const updatedAdmin = await apiService.toggleAdminBlock(idNumber, currentUser.idNumber);
            setAdminDirectory(prev => new Map(prev).set(idNumber, updatedAdmin));
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleToggleAdminsBlock = async (idNumbers: string[], block: boolean) => {
        if (currentUser?.userType !== 'ADMIN') return;
        try {
            const updatedAdmins = await apiService.toggleAdminsBlock(idNumbers, currentUser.idNumber, block);
            setAdminDirectory(updatedAdmins);
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleToggleAdminPresence = async (adminId: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        try {
            const { updatedAdmin, updatedTimeTable } = await apiService.toggleAdminPresence(adminId, currentUser.idNumber);
            setAdminDirectory(prev => new Map(prev).set(adminId, updatedAdmin));
            setTimeTable(updatedTimeTable);
            // Also update currentUser if they are toggling their own presence
            if(currentUser.idNumber === adminId){
                setCurrentUser(prev => prev ? ({ ...prev, ...updatedAdmin }) : null);
            }
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleAddDepartment = async (name: string) => {
        if (name && !departments.includes(name)) {
            const newDepartments = await apiService.addDepartment(name);
            setDepartments(newDepartments);
        }
    };
    
    const handleDownload = (filteredAttendance: AttendanceRecord[]) => exportAttendanceToCSV(filteredAttendance, faceLinks, studentDirectory);

    const handleLogAttendance = async (persistentId: number, emotion: Emotion, subject?: string) => {
        const newAttendance = await apiService.logAttendance(persistentId, emotion, subject);
        setAttendance(newAttendance);
    };

    const handleSetManualAttendance = async (studentRollNumber: string, subject: string, status: 'present' | 'absent') => {
        if (currentUser?.userType !== 'ADMIN') return;
        const newAttendance = await apiService.setManualAttendance(studentRollNumber, subject, new Date(), status, currentUser.idNumber);
        setAttendance(newAttendance);
    };

    const handleUpdateMarks = async (updates: MarkUpdate[]) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedStudents = await apiService.updateBulkStudentMarks(updates, currentUser.idNumber);
        setStudentDirectory(updatedStudents);
    };

    const handleUpdateTimeTable = async (entries: TimeTableEntry[]) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedTimeTable = await apiService.saveTimeTableEntries(entries, currentUser.idNumber);
        setTimeTable(updatedTimeTable);
    };

    const handleUpdateTimetableEntry = async (entry: TimeTableEntry) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedTimeTable = await apiService.updateTimeTableEntry(entry, currentUser.idNumber);
        setTimeTable(updatedTimeTable);
    };

    const handleLogGenericAction = (action: string, details: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        apiService.logGenericAdminAction(currentUser.idNumber, action, details);
    };

    const handleRequestLeave = async (startDate: string, endDate: string, reason: string) => {
        if (!currentUser) return;
        const id = currentUser.userType === 'ADMIN' ? currentUser.idNumber : currentUser.rollNumber;
        const updatedLeaveRecords = await apiService.requestLeave(id, startDate, endDate, reason);
        setLeaveRecords(updatedLeaveRecords);
    };

    const handleCancelOwnLeave = async (leaveId: string) => {
        if (!currentUser) return;
        const id = currentUser.userType === 'ADMIN' ? currentUser.idNumber : currentUser.rollNumber;
        const updatedLeaveRecords = await apiService.cancelOwnLeave(leaveId, id);
        setLeaveRecords(updatedLeaveRecords);
    };

    const handleApproveLeave = async (leaveId: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const { updatedLeaveRecords, updatedTimeTable } = await apiService.approveLeave(leaveId, currentUser.idNumber);
        setLeaveRecords(updatedLeaveRecords);
        setTimeTable(updatedTimeTable);
    };

    const handleRejectLeave = async (leaveId: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const updatedLeaveRecords = await apiService.rejectLeave(leaveId, currentUser.idNumber);
        setLeaveRecords(updatedLeaveRecords);
    };

    const handleGrantHoliday = async (startDate: string, endDate: string, reason: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const { updatedHolidays, updatedTimeTable } = await apiService.grantHoliday(startDate, endDate, reason, currentUser.idNumber);
        setHolidays(updatedHolidays);
        setTimeTable(updatedTimeTable);
    };

    const handleCancelHoliday = async (holidayId: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const { updatedHolidays, updatedTimeTable } = await apiService.cancelHoliday(holidayId, currentUser.idNumber);
        setHolidays(updatedHolidays);
        setTimeTable(updatedTimeTable);
    };

    const handleSendMessage = async (receiverId: string, content: string, file?: { name: string; url: string }, isPriority?: boolean) => {
        if (!currentUser) throw new Error("No user is logged in.");
        const senderId = currentUser.userType === 'STUDENT' ? currentUser.rollNumber : currentUser.idNumber;
        const updatedConversations = await apiService.sendMessage(senderId, receiverId, content, file, isPriority);
        setConversations(updatedConversations);
    };

    // --- Notification Handlers ---
    const handleMarkNotificationAsRead = async (notificationId: string) => {
        await apiService.markNotificationAsRead(notificationId);
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    };

    const handleMarkAllNotificationsAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
            await apiService.markAllNotificationsAsRead(unreadIds);
            setNotifications(prev => prev.map(n => 
                !n.isRead ? { ...n, isRead: true } : n
            ));
        }
    };

    const handleSendBroadcast = async (target: string, title: string, message: string) => {
        if (!currentUser || currentUser.userType !== 'ADMIN') {
            throw new Error("User is not an authorized admin.");
        }
        try {
            await apiService.sendBroadcast(currentUser.idNumber, target, title, message);
            addToast({ title: "Success", message: "Broadcast sent successfully!", type: 'success' });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            addToast({ title: 'Broadcast Failed', message: errorMessage, type: 'error' });
            throw err; // Re-throw so modal can catch it
        }
    };
    
    // --- Community Feature Handlers ---
    const handleDeleteStudyGroup = async (groupId: string) => {
        if (currentUser?.userType !== 'ADMIN') return;
        const { updatedGroups, updatedStudents } = await apiService.deleteStudyGroup(groupId, currentUser.idNumber);
        setStudyGroups(updatedGroups);
        setStudentDirectory(updatedStudents);
    };

    const handleCreateStudyGroup = async (groupData: Omit<StudyGroup, 'id' | 'events' | 'messages'>) => {
        const { newGroup, updatedStudents } = await apiService.createStudyGroup(groupData);
        setStudyGroups(prev => [...prev, newGroup]);
        setStudentDirectory(updatedStudents);
        if(currentUser?.userType === 'STUDENT'){
            setCurrentUser(prev => ({...prev!, ...updatedStudents.get(currentUser.rollNumber)}));
        }
    };
    
    const handleJoinStudyGroup = async (groupId: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const { updatedGroup, updatedStudent } = await apiService.joinStudyGroup(groupId, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
        setStudentDirectory(prev => new Map(prev).set(updatedStudent.rollNumber, updatedStudent));
        setCurrentUser(prev => ({...prev!, ...updatedStudent}));
    };

    const handleDeclineStudyGroupInvitation = async (groupId: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const { updatedGroup } = await apiService.declineStudyGroupInvitation(groupId, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };
    
    const handleSendGroupMessage = async (groupId: string, content: string, file?: { name: string; url: string }, audio?: { url: string; duration: number }, replyToMessageId?: string) => {
        if (currentUser?.userType !== 'STUDENT' && currentUser?.userType !== 'ADMIN') return;
        const senderId = currentUser.userType === 'STUDENT' ? currentUser.rollNumber : currentUser.idNumber;
        const updatedGroup = await apiService.sendGroupMessage(groupId, senderId, content, file, audio, replyToMessageId);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };

    const handleDeleteGroupMessage = async (groupId: string, messageId: string, deleteType: 'me' | 'everyone') => {
        if (!currentUser) return;
        const requestorId = currentUser.userType === 'STUDENT' ? currentUser.rollNumber : currentUser.idNumber;
        try {
            const updatedGroup = await apiService.deleteGroupMessage(groupId, messageId, requestorId, deleteType);
            setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
        } catch (err) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Could not delete message.";
            setError({ title: "Action Failed", message });
        }
    };

    const handleDeleteGroupResource = async (groupId: string, resourceId: string) => {
        if (!currentUser) return;
        const userId = currentUser.userType === 'STUDENT' ? currentUser.rollNumber : currentUser.idNumber;
        const updatedGroup = await apiService.deleteGroupResource(groupId, resourceId, userId);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };

    const handleUploadNote = async (noteData: Omit<SharedNote, 'id' | 'ratings' | 'createdAt'>) => {
        const newNote = await apiService.uploadNote(noteData);
        setSharedNotes(prev => [newNote, ...prev]);
    };

    const handleRateNote = async (noteId: string, rating: number) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedNote = await apiService.rateNote(noteId, rating, currentUser.rollNumber);
        setSharedNotes(prev => prev.map(n => n.id === noteId ? updatedNote : n));
    };

    const handleSuggestStudyTime = async (groupId: string): Promise<{ dayOfWeek: number, startTime: string, reason: string }[]> => {
        return await apiService.suggestStudyTime(groupId);
    };

    const handleSummarizeNote = async (noteId: string): Promise<string> => {
        return await apiService.summarizeNote(noteId);
    };

    // --- New Group Management Handlers ---
    const handlePinMessage = async (groupId: string, messageId: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedGroup = await apiService.pinMessage(groupId, messageId, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };
    
    const handleAddTask = async (groupId: string, task: Omit<GroupTask, 'id' | 'completed'>) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedGroup = await apiService.addTask(groupId, task, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };
    
    const handleToggleTask = async (groupId: string, taskId: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedGroup = await apiService.toggleTask(groupId, taskId, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };

    const handleDeleteStudyGroupByStudent = async (groupId: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const { updatedGroups, updatedStudents } = await apiService.deleteStudyGroupByStudent(groupId, currentUser.rollNumber);
        setStudyGroups(updatedGroups);
        setStudentDirectory(updatedStudents);
        // Important: Update the current user's state to reflect removal from the group
        setCurrentUser(prev => ({...prev!, ...updatedStudents.get(currentUser.rollNumber)}));
    };

    const handleAddMemberToGroup = async (groupId: string, studentRollNumber: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const { updatedGroup, updatedStudentDirectory } = await apiService.addMemberToStudyGroup(groupId, studentRollNumber, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
        setStudentDirectory(updatedStudentDirectory);
    };

    const handleScheduleGroupEvent = async (groupId: string, eventData: Omit<GroupEvent, 'id'>) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedGroup = await apiService.scheduleGroupEvent(groupId, eventData, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };
    
    const handleDeleteGroupEvent = async (groupId: string, eventId: string) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedGroup = await apiService.deleteGroupEvent(groupId, eventId, currentUser.rollNumber);
        setStudyGroups(prev => prev.map(g => g.id === groupId ? updatedGroup : g));
    };

    // Fix: Add handlers for prediction feature
    const handlePlacePrediction = async (subject: string, midTerm: 'mid1' | 'mid2', predictedMarks: number) => {
        if (currentUser?.userType !== 'STUDENT') return;
        const updatedStudent = await apiService.placePrediction(currentUser.rollNumber, subject, midTerm, predictedMarks);
        setStudentDirectory(prev => new Map(prev).set(updatedStudent.rollNumber, updatedStudent));
        setCurrentUser({ ...updatedStudent, userType: 'STUDENT' });
    };

    const handleClaimReward = async (subject: string, midTerm: 'mid1' | 'mid2') => {
        if (currentUser?.userType !== 'STUDENT') return;
        try {
            const updatedStudent = await apiService.claimReward(currentUser.rollNumber, subject, midTerm);
            setStudentDirectory(prev => new Map(prev).set(updatedStudent.rollNumber, updatedStudent));
            setCurrentUser({ ...updatedStudent, userType: 'STUDENT' });
        } catch(err) {
            console.error("Failed to claim reward:", err);
            setError({ title: "Action Failed", message: err instanceof Error ? err.message : "Could not claim reward." });
        }
    };


    // --- AI Insights Handler ---
    const handleGetAttendanceAnomalies = async (studentsToAnalyze: StudentInfo[]): Promise<AttendanceAnomaly[]> => {
        return await apiService.getAttendanceAnomalies(studentsToAnalyze, attendance, faceLinks);
    };

    // --- RAG Handler ---
    const handleQueryKnowledgeBase = async (query: string): Promise<{ answer: string; sources: KnowledgeDocument[] }> => {
        return await apiService.queryKnowledgeBase(query);
    };


    const captureAndAnalyze = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || isProcessing.current || isPausedForRateLimit) {
            return;
        }

        isProcessing.current = true;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context || video.videoWidth === 0) {
            isProcessing.current = false;
            return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64ImageData = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        try {
            const result = await detectFacesAndHands(base64ImageData);
            setError(null);
            setIsApiError(false);
            
            const now = Date.now();
            const trackedFaces = trackedFacesRef.current;
            const newTrackedFaces = new Map<number, TrackedFace>();
            
            const matchedGeminiIds = new Set<string>();

            result.faces.forEach(face => {
                let bestMatchId: number | null = null;
                let bestIoU = 0.3; // IoU threshold

                trackedFaces.forEach((trackedFace, id) => {
                    const iou = calculateIoU(face.boundingBox, trackedFace.boundingBox);
                    if (iou > bestIoU) {
                        bestIoU = iou;
                        bestMatchId = id;
                    }
                });

                if (bestMatchId !== null && !matchedGeminiIds.has(trackedFaces.get(bestMatchId)!.geminiId)) {
                    const oldTrack = trackedFaces.get(bestMatchId)!;
                    face.persistentId = bestMatchId;
                    newTrackedFaces.set(bestMatchId, {
                        ...oldTrack,
                        boundingBox: face.boundingBox,
                        lastSeen: now,
                        consecutiveMisses: 0,
                    });
                    matchedGeminiIds.add(oldTrack.geminiId);
                    trackedFaces.delete(bestMatchId);
                } else {
                    const newId = nextFaceIdRef.current++;
                    face.persistentId = newId;
                    newTrackedFaces.set(newId, {
                        boundingBox: face.boundingBox,
                        velocity: { x: 0, y: 0 },
                        lastSeen: now,
                        geminiId: face.personId,
                        consecutiveMisses: 0,
                    });
                }
                
                // Attach student info if linked
                const rollNumber = faceLinks.get(face.persistentId);
                if (rollNumber) {
                    face.studentInfo = studentDirectory.get(rollNumber);
                }
            });

            // Handle misses
            trackedFaces.forEach((trackedFace, id) => {
                if (now - trackedFace.lastSeen < 3000) { // Keep unmatched faces for a bit
                     trackedFace.consecutiveMisses++;
                     if (trackedFace.consecutiveMisses < 3) {
                        newTrackedFaces.set(id, trackedFace);
                     }
                }
            });
            
            trackedFacesRef.current = newTrackedFaces;
            setDetectionResult(result);
            
             // Log attendance
            result.faces.forEach(face => {
                if (face.persistentId && face.studentInfo && !face.studentInfo.blockExpiresAt) {
                    const lastLog = lastAttendanceLogRef.current.get(face.persistentId) || 0;
                    if (now - lastLog > ATTENDANCE_LOG_INTERVAL_MS) {
                        handleLogAttendance(face.persistentId, face.emotion, analyzerContext?.subject);
                        lastAttendanceLogRef.current.set(face.persistentId, now);
                    }
                }
            });

        } catch (err) {
            console.error("Analysis failed:", err);
            const message = err instanceof Error ? err.message : "An unknown error occurred";
            if (message === 'RATE_LIMIT') {
                setIsPausedForRateLimit(true);
                setTimeout(() => setIsPausedForRateLimit(false), RATE_LIMIT_PAUSE_MS);
            } else if (message === 'NETWORK_ERROR') {
                 setError({ title: "Network Error", message: "Cannot connect to the AI service. Please check your connection." });
                 setIsApiError(true);
            } else {
                 setError({ title: "API Error", message: "Failed to process the video frame." });
                 setIsApiError(true);
            }
        } finally {
            isProcessing.current = false;
        }
    }, [faceLinks, studentDirectory, isPausedForRateLimit, analyzerContext]);

    useEffect(() => {
        let intervalId: number;
        if (stream) {
            intervalId = window.setInterval(captureAndAnalyze, ANALYSIS_INTERVAL);
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [stream, captureAndAnalyze]);
    
     const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-screen">
                    <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-24 h-24 mb-4 rounded-full shadow-lg animate-pulse" />
                    <p className="text-lg text-gray-400">Loading University Data...</p>
                </div>
            );
        }

        switch(view) {
            case 'LOGIN': return <LoginScreen onLogin={handleLogin} onNavigateToRegister={(type) => setView(type === 'ADMIN' ? 'ADMIN_REGISTRATION' : 'STUDENT_REGISTRATION')} onForgotPassword={() => setView('FORGOT_PASSWORD')} onBlockedLogin={handleBlockedLogin} />;
            case 'STUDENT_REGISTRATION': return <StudentRegistrationScreen departments={departments} onRegisterStudent={handleStudentRegister} onBackToLogin={() => setView('LOGIN')} />;
            case 'ADMIN_REGISTRATION': return <AdminRegistrationScreen departments={departments} onRegisterAdmin={handleAdminRegister} onBackToLogin={() => setView('LOGIN')} />;
            case 'ADMIN_DASHBOARD': return currentUser?.userType === 'ADMIN' ? <AdminDashboard currentUser={currentUser} studentDirectory={studentDirectory} adminDirectory={adminDirectory} departments={departments} attendance={attendance} faceLinks={faceLinks} timeTable={timeTable} leaveRecords={leaveRecords} conversations={conversations} studyGroups={studyGroups} onDeleteStudyGroup={handleDeleteStudyGroup} onSendMessage={handleSendMessage} onApproveLeave={handleApproveLeave} onRejectLeave={handleRejectLeave} onUpdateTimeTable={handleUpdateTimeTable} onDeleteStudent={handleDeleteStudent} onBlockStudent={handleBlockStudent} onUnblockStudent={handleUnblockStudent} onDeleteAdmin={handleDeleteAdmin} onToggleBlockAdmin={handleToggleBlockAdmin} onToggleAdminPresence={handleToggleAdminPresence} onLogout={handleLogout} onDownload={handleDownload} onUpdateMarks={handleUpdateMarks} onLogAction={handleLogGenericAction} onNavigateToAnalyzer={() => setView('ANALYZER')} onChangePassword={handleChangePassword} onNavigateToSettings={() => setView('SETTINGS')} onBulkRegister={handleBulkRegister} onUpdateTimetableEntry={handleUpdateTimetableEntry} onNavigateToHolidayManagement={() => setView('HOLIDAY_MANAGEMENT')} onRequestLeave={handleRequestLeave} onCancelOwnLeave={handleCancelOwnLeave} onDeleteStudents={handleDeleteStudents} onBlockStudents={handleBlockStudents} onUnblockStudents={handleUnblockStudents} onDeleteAdmins={handleDeleteAdmins} onToggleAdminsBlock={handleToggleAdminsBlock} onGetAnomalies={handleGetAttendanceAnomalies} notifications={notifications} onMarkNotificationAsRead={handleMarkNotificationAsRead} onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead} onSendBroadcast={handleSendBroadcast} onQueryKnowledgeBase={handleQueryKnowledgeBase} /> : null;
            case 'TEACHER_DASHBOARD': return currentUser?.userType === 'ADMIN' ? <TeacherDashboard currentUser={currentUser} studentDirectory={studentDirectory} adminDirectory={adminDirectory} attendance={attendance} faceLinks={faceLinks} timeTable={timeTable} leaveRecords={leaveRecords} conversations={conversations} onSendMessage={handleSendMessage} onLogout={handleLogout} onStartAnalyzer={handleStartAnalyzerWithContext} onNavigateToSettings={() => setView('SETTINGS')} onSetManualAttendance={handleSetManualAttendance} onUpdateMarks={handleUpdateMarks} onLogAction={handleLogGenericAction} departments={departments} onRequestLeave={handleRequestLeave} onCancelOwnLeave={handleCancelOwnLeave} onToggleAdminPresence={handleToggleAdminPresence} notifications={notifications} onMarkNotificationAsRead={handleMarkNotificationAsRead} onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead} onQueryKnowledgeBase={handleQueryKnowledgeBase} /> : null;
            case 'STUDENT_DASHBOARD': {
                if (currentUser?.userType === 'STUDENT') {
                    const studentUser = currentUser;
                    return <StudentDashboard 
                        currentUser={studentUser} 
                        attendance={attendance} 
                        faceLinks={faceLinks} 
                        studentDirectory={studentDirectory} 
                        adminDirectory={adminDirectory} 
                        timeTable={timeTable} 
                        conversations={conversations} 
                        holidays={holidays}
                        studyGroups={studyGroups}
                        sharedNotes={sharedNotes}
                        notifications={notifications}
                        onSendMessage={handleSendMessage} 
                        onLogout={handleLogout} 
                        onLogAttendance={handleLogAttendance} 
                        onLinkFace={() => handleStudentSelfLinkFace(studentUser.rollNumber)} 
                        onChangePassword={handleChangePassword} 
                        onNavigateToSettings={() => setView('SETTINGS')}
                        onMarkNotificationAsRead={handleMarkNotificationAsRead}
                        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead} 
                        onCreateStudyGroup={handleCreateStudyGroup}
                        onJoinStudyGroup={handleJoinStudyGroup}
                        onDeclineStudyGroupInvitation={handleDeclineStudyGroupInvitation}
                        onSendGroupMessage={handleSendGroupMessage}
                        onDeleteGroupMessage={handleDeleteGroupMessage}
                        onDeleteGroupResource={handleDeleteGroupResource}
                        onUploadNote={handleUploadNote}
                        onRateNote={handleRateNote}
                        onSuggestStudyTime={handleSuggestStudyTime}
                        onSummarizeNote={handleSummarizeNote}
                        onPinMessage={handlePinMessage}
                        onAddTask={handleAddTask}
                        onToggleTask={handleToggleTask}
                        onDeleteStudyGroup={handleDeleteStudyGroupByStudent}
                        onPlacePrediction={handlePlacePrediction}
                        onClaimReward={handleClaimReward}
                        onAddMemberToGroup={handleAddMemberToGroup}
                        onScheduleEvent={handleScheduleGroupEvent}
                        onDeleteEvent={handleDeleteGroupEvent}
                        onQueryKnowledgeBase={handleQueryKnowledgeBase}
                    />;
                }
                return null;
            }
            case 'VERIFY_ACCOUNT': return userToVerify ? <VerificationScreen userToVerify={userToVerify} onVerified={() => {setUserToVerify(null); setView('LOGIN');}} onBackToLogin={() => setView('LOGIN')} /> : null;
            case 'FORGOT_PASSWORD': return <ForgotPasswordScreen onRequestReset={handleRequestPasswordReset} onBackToLogin={() => setView('LOGIN')} />;
            case 'RESET_PASSWORD': return <ResetPasswordScreen onResetPassword={handleResetPassword} onBackToLogin={() => setView('LOGIN')} />;
            case 'SETTINGS': return currentUser ? <SettingsScreen onBackToDashboard={() => setView(currentUser.userType === 'STUDENT' ? 'STUDENT_DASHBOARD' : (currentUser.designation === Designation.Teacher || currentUser.designation === Designation.Incharge ? 'TEACHER_DASHBOARD' : 'ADMIN_DASHBOARD'))} onChangePassword={handleChangePassword} onDeleteSelf={handleDeleteSelf} theme={theme} setTheme={setTheme} /> : null;
            case 'ONBOARDING': return currentUser?.userType === 'STUDENT' ? <OnboardingScreen currentUser={currentUser} onComplete={handleCompleteStudentOnboarding} /> : null;
            case 'BLOCKED': return blockedInfo ? <BlockedScreen blockedInfo={blockedInfo} onBackToLogin={() => {setBlockedInfo(null); setView('LOGIN');}} /> : null;
            case 'HOLIDAY_MANAGEMENT': return currentUser?.userType === 'ADMIN' ? <HolidayManagementScreen holidays={holidays} onGrantHoliday={handleGrantHoliday} onCancelHoliday={handleCancelHoliday} onBackToDashboard={() => setView('ADMIN_DASHBOARD')} /> : null;
            default: return <div>Unknown view</div>;
        }
    }

    return (
        <>
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            {view === 'ANALYZER' ? (
                <div className="w-full max-w-7xl mx-auto flex flex-col h-full animate-fade-in">
                    <header className="mb-4 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <img src="https://krucet.ac.in/wp-content/uploads/2020/09/cropped-kru-150-round-non-transparent-1.png" alt="Krishna University Logo" className="w-10 h-10 rounded-full" />
                            <div>
                                <h1 className="text-xl font-bold text-white">Live Attendance Analyzer</h1>
                                {analyzerContext && <p className="text-sm text-blue-300">Subject: {analyzerContext.subject}</p>}
                            </div>
                        </div>
                        <div className="flex gap-2 self-end sm:self-auto">
                             <button
                                onClick={() => {
                                    handleStopCamera();
                                    if(currentUser?.userType === 'ADMIN') {
                                        if (currentUser.designation === Designation.Teacher || currentUser.designation === Designation.Incharge) {
                                            setView('TEACHER_DASHBOARD');
                                        } else {
                                            setView('ADMIN_DASHBOARD');
                                        }
                                    } else {
                                        setView('LOGIN');
                                    }
                                }}
                                className="px-4 py-2 rounded-lg font-semibold text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                            >
                                Back to Dashboard
                            </button>
                             <button
                                onClick={stream ? handleStopCamera : handleStartCamera}
                                onMouseMove={handleMouseMove}
                                className={`btn-animated px-6 py-2 rounded-lg font-semibold text-white shadow-lg ${stream ? 'bg-red-600' : 'bg-blue-600'}`}
                            >
                                <span className="btn-content">
                                    <span className="btn-dot"></span>
                                    <CameraIcon className="w-5 h-5" />
                                    <span>{stream ? 'Stop Camera' : 'Stop Camera'}</span>
                                </span>
                            </button>
                        </div>
                    </header>
                    <main className="w-full flex-grow flex flex-col md:flex-row gap-4 items-start">
                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-800 flex items-center justify-center">
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                muted 
                                playsInline 
                                onLoadedMetadata={() => {
                                    if(videoRef.current) {
                                        setVideoDimensions({width: videoRef.current.videoWidth, height: videoRef.current.videoHeight});
                                    }
                                }}
                                className="w-full h-full object-cover transform -scale-x-100"
                            />
                            <canvas ref={canvasRef} className="hidden" />
                            {!stream && <WelcomeScreen />}
                            {stream && <DetectionOverlay result={detectionResult} videoWidth={videoDimensions.width} videoHeight={videoDimensions.height} onRegister={handleRegisterStudentFace} focusPoint={focusPoint} />}
                             {error && isApiError && (
                                <div className="absolute bottom-4 left-4 bg-red-800/80 text-white p-3 rounded-lg animate-fade-in text-sm">{error.title}: {error.message}</div>
                            )}
                             {isPausedForRateLimit && (
                                <div className="absolute bottom-4 left-4 bg-yellow-600/80 text-black p-3 rounded-lg animate-fade-in text-sm font-semibold">Rate limit reached. Pausing analysis for 60s.</div>
                            )}
                            <div className="absolute top-0 left-0 w-full h-4 bg-red-500 scanner-line animate-scanner hidden"></div>
                        </div>
                         <DetectionSummary result={detectionResult} studentCount={faceLinks.size} />
                    </main>
                     {registrationTarget && (
                         <RegistrationModal 
                            face={registrationTarget}
                            unlinkedStudents={Array.from<StudentInfo>(studentDirectory.values()).filter(s => !Array.from(faceLinks.values()).includes(s.rollNumber))}
                            onClose={() => setRegistrationTarget(null)}
                            onLink={handleLinkFaceToStudent}
                        />
                    )}
                </div>
            ) : (
                renderContent()
            )}
             { (view === 'LOGIN' || view === 'STUDENT_REGISTRATION' || view === 'ADMIN_REGISTRATION' || view === 'VERIFY_ACCOUNT' || view === 'FORGOT_PASSWORD' || view === 'RESET_PASSWORD' || view === 'ONBOARDING') && <MockInbox emails={simulatedEmails} />}
             { currentUser?.userType === 'ADMIN' && <AIChatbot studentDirectory={studentDirectory} adminDirectory={adminDirectory} /> }
        </div>
        </>
    );
}

export default App;