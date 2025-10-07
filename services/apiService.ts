import { 
    loadStudentDirectory, saveStudentDirectory, 
    loadAdminDirectory, saveAdminDirectory,
    loadFaceLinks, saveFaceLinks,
    loadAttendance, saveAttendance, 
    loadDepartments, saveDepartments,
    loadVerificationTokens, saveVerificationTokens,
    loadPasswordResetTokens, savePasswordResetTokens,
    loadTimeTable, saveTimeTable,
    loadLeaveRecords, saveLeaveRecords,
    loadConversations, saveConversations,
    loadHolidays, saveHolidays,
    loadStudyGroups, saveStudyGroups,
    loadSharedNotes, saveSharedNotes,
    loadNotifications, saveNotifications
} from './storageService';
import { StudentInfo, AdminInfo, AttendanceRecord, Emotion, Designation, VerificationToken, PasswordResetToken, TimeTableEntry, LeaveRecord, Conversation, ChatMessage, Holiday, Year, StudyGroup, SharedNote, GroupChatMessage, NoteRating, AttendanceAnomaly, GroupTask, GroupMemberRole, GroupResource, Notification, GroupEvent, KnowledgeDocument, Gender } from '../types';
import { logAdminAction } from './logService';
import { sendVerificationEmail, sendPasswordResetEmail, sendUnblockNotificationEmail, sendLeaveNotificationEmail, sendHolidayNotificationEmail, sendLeaveStatusNotificationEmail } from './emailService';
import { suggestSubstituteTeacher, rescheduleClass, suggestStudyTime as geminiSuggestStudyTime, summarizeNoteContent as geminiSummarizeNote, analyzeAttendanceAnomalies, askAI, recognizeFace } from './geminiService';
import * as knowledgeBaseService from './knowledgeBaseService';


const API_LATENCY = 200; // ms
const TOKEN_EXPIRATION_MS = 15 * 60 * 1000; // 15 minutes

type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

// Custom Error for Blocked Login
export class BlockedLoginError extends Error {
    details: { blockedBy: string | null; expiresAt: number | null };
    constructor(message: string, details: { blockedBy: string | null; expiresAt: number | null }) {
        super(message);
        this.name = 'BlockedLoginError';
        this.details = details;
    }
}

// Helper to decode Base64 to UTF-8
function base64ToUtf8(str: string): string {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}


// --- Token Generation ---
const generateAndSaveVerificationToken = (identifier: string): VerificationToken => {
    const tokens = loadVerificationTokens();
    // Remove any existing tokens for this user
    const otherTokens = tokens.filter(t => t.identifier !== identifier);
    
    const token: VerificationToken = {
        identifier,
        token: Math.floor(100000 + Math.random() * 900000).toString(),
        expiresAt: Date.now() + TOKEN_EXPIRATION_MS,
    };
    
    saveVerificationTokens([...otherTokens, token]);
    return token;
};

const generateAndSavePasswordResetToken = (identifier: string): PasswordResetToken => {
    const tokens = loadPasswordResetTokens();
    const otherTokens = tokens.filter(t => t.identifier !== identifier);
    const token: PasswordResetToken = {
        identifier,
        token: `KU-RESET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        expiresAt: Date.now() + TOKEN_EXPIRATION_MS,
    };
    savePasswordResetTokens([...otherTokens, token]);
    return token;
};


// --- Notification Service ---
let notificationListener: ((notification: Notification) => void) | null = null;

export const setNotificationListener = (listener: (notification: Notification) => void) => {
    notificationListener = listener;
};

const createNotification = (notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): void => {
    const notifications = loadNotifications();
    const newNotification: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        isRead: false,
        ...notificationData,
    };
    notifications.push(newNotification);
    saveNotifications(notifications);
    
    if (notificationListener) {
        notificationListener(newNotification);
    }
};

export const getNotificationsForUser = (user: CurrentUser): Promise<Notification[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const allNotifications = loadNotifications();
            const userId = user.userType === 'STUDENT' ? user.rollNumber : user.idNumber;
            
            let finalNotifications = allNotifications;

            // For students, automatically clear notifications that are older than 4 PM of the previous day.
            if (user.userType === 'STUDENT') {
                const now = new Date();
                
                const expiredStudentNotifications = allNotifications.filter(notif => {
                    if (notif.recipientId !== userId) {
                        return false; // Only check notifications for the current student
                    }

                    // Calculate the expiry date: 4 PM on the day AFTER the notification was created.
                    const creationDate = new Date(notif.timestamp);
                    const expiryDate = new Date(creationDate);
                    expiryDate.setDate(creationDate.getDate() + 1); // Next day
                    expiryDate.setHours(16, 0, 0, 0); // at 4 PM

                    // If 'now' is past the expiry date, the notification is expired.
                    return now.getTime() >= expiryDate.getTime();
                });

                if (expiredStudentNotifications.length > 0) {
                    const expiredIds = new Set(expiredStudentNotifications.map(n => n.id));
                    const updatedNotifications = allNotifications.filter(notif => !expiredIds.has(notif.id));
                    saveNotifications(updatedNotifications);
                    finalNotifications = updatedNotifications;
                }
            }

            const userNotifications = finalNotifications.filter(notif => notif.recipientId === userId);
            
            resolve(userNotifications.sort((a, b) => b.timestamp - a.timestamp));
        }, API_LATENCY / 2);
    });
};

export const markNotificationAsRead = (notificationId: string): Promise<Notification[]> => {
    return new Promise((resolve) => {
        const notifications = loadNotifications();
        const index = notifications.findIndex(n => n.id === notificationId);
        if (index > -1) {
            notifications[index].isRead = true;
            saveNotifications(notifications);
        }
        resolve(notifications);
    });
};

export const markAllNotificationsAsRead = (notificationIdsToMark: string[]): Promise<Notification[]> => {
    return new Promise((resolve) => {
        const idsToMark = new Set(notificationIdsToMark);
        const notifications = loadNotifications().map(n => {
            if (idsToMark.has(n.id)) {
                return { ...n, isRead: true };
            }
            return n;
        });
        saveNotifications(notifications);
        resolve(notifications);
    });
};

// --- Auth & Password Management ---
export const loginAdmin = (idNumber: string, password: string): Promise<AdminInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const admins = loadAdminDirectory();
            const user = admins.get(idNumber);
            if (user && user.password === password) {
                if (user.isBlocked) {
                    reject(new Error('This admin account is blocked.'));
                } else if (!user.isVerified) {
                    reject(new Error('Account not verified. Please check your email.'));
                } else {
                    resolve(user);
                }
            } else {
                reject(new Error('Invalid credentials. Please try again.'));
            }
        }, API_LATENCY);
    });
};

export const loginStudent = (rollNumber: string, password: string): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            const user = students.get(rollNumber.toUpperCase());
            if (user && user.password === password) {
                if (user.blockExpiresAt && user.blockExpiresAt > Date.now()) {
                    const expiryTime = user.blockExpiresAt === Infinity ? 'permanently' : `until ${new Date(user.blockExpiresAt).toLocaleTimeString()}`;
                     reject(new BlockedLoginError(
                        `This student account is blocked ${expiryTime}.`,
                        { blockedBy: user.blockedBy, expiresAt: user.blockExpiresAt }
                    ));
                } else if (user.blockExpiresAt && user.blockExpiresAt <= Date.now()){
                    // Automatic unblock for expired temporary blocks
                    const admins = loadAdminDirectory();
                    const adminName = admins.get(user.blockedBy || '')?.name || 'System';
                    user.blockExpiresAt = null;
                    user.blockedBy = null;
                    students.set(user.rollNumber, user);
                    saveStudentDirectory(students);
                    sendUnblockNotificationEmail(user.email, adminName, true);
                    resolve(user);
                } else {
                    resolve(user); // Resolve even if not verified, UI will handle redirection
                }
            } else {
                reject(new Error('Invalid credentials. Please try again.'));
            }
        }, API_LATENCY);
    });
};

export const requestPasswordReset = (email: string): Promise<PasswordResetToken> => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            const students = loadStudentDirectory();
            const admins = loadAdminDirectory();
            const lowerCaseEmail = email.toLowerCase();

            let userFound = false;
            for (const user of [...students.values(), ...admins.values()]) {
                if (user.email.toLowerCase() === lowerCaseEmail) {
                    userFound = true;
                    break;
                }
            }

            if (!userFound) {
                return reject(new Error("No account found with that email address."));
            }

            const resetToken = generateAndSavePasswordResetToken(lowerCaseEmail);
            await sendPasswordResetEmail(lowerCaseEmail, resetToken.token);
            resolve(resetToken);
        }, API_LATENCY);
    });
};

export const resetPassword = (token: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const tokens = loadPasswordResetTokens();
            const storedToken = tokens.find(t => t.token === token);

            if (!storedToken) return reject(new Error("Invalid or expired password reset token."));
            if (storedToken.expiresAt < Date.now()) return reject(new Error("Password reset token has expired."));

            const email = storedToken.identifier;
            let userUpdated = false;

            const students = loadStudentDirectory();
            for (const student of students.values()) {
                if (student.email.toLowerCase() === email) {
                    student.password = newPassword;
                    students.set(student.rollNumber, student);
                    saveStudentDirectory(students);
                    userUpdated = true;
                    break;
                }
            }

            if (!userUpdated) {
                const admins = loadAdminDirectory();
                for (const admin of admins.values()) {
                    if (admin.email.toLowerCase() === email) {
                        admin.password = newPassword;
                        admins.set(admin.idNumber, admin);
                        saveAdminDirectory(admins);
                        userUpdated = true;
                        break;
                    }
                }
            }
            
            if (userUpdated) {
                savePasswordResetTokens(tokens.filter(t => t.token !== token)); // Invalidate token
                resolve();
            } else {
                reject(new Error("Could not find user to update password for."));
            }
        }, API_LATENCY);
    });
};

export const changePassword = (identifier: string, userType: 'STUDENT' | 'ADMIN', currentPassword: string, newPassword: string): Promise<{ updatedUser: StudentInfo | AdminInfo, userType: 'STUDENT' | 'ADMIN' }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (userType === 'STUDENT') {
                const students = loadStudentDirectory();
                const student = students.get(identifier);
                if (!student) return reject(new Error("Student not found."));
                if (student.password !== currentPassword) return reject(new Error("Current password does not match."));
                
                student.password = newPassword;
                students.set(identifier, student);
                saveStudentDirectory(students);
                resolve({ updatedUser: student, userType: 'STUDENT' });
            } else {
                const admins = loadAdminDirectory();
                const admin = admins.get(identifier);
                if (!admin) return reject(new Error("Admin not found."));
                if (admin.password !== currentPassword) return reject(new Error("Current password does not match."));

                admin.password = newPassword;
                admins.set(identifier, admin);
                saveAdminDirectory(admins);
                resolve({ updatedUser: admin, userType: 'ADMIN' });
            }
        }, API_LATENCY);
    });
};

// --- START OF ADDED FUNCTIONS ---

export const getConversations = (userId: string, userType: 'STUDENT' | 'ADMIN', designation?: Designation, department?: string): Promise<Conversation[]> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const allConversations = loadConversations();
            if (userType === 'STUDENT') {
                resolve(allConversations.filter(c => c.participantIds.includes(userId)));
            } else { // ADMIN
                const isLeadership = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal].includes(designation!);
                if (isLeadership) {
                    resolve(allConversations); // Leadership sees all
                } else if (designation === Designation.HOD) {
                    const admins = loadAdminDirectory();
                    const students = loadStudentDirectory();
                    const staffInDept = Array.from(admins.values()).filter((a: AdminInfo) => a.department === department).map((a: AdminInfo) => a.idNumber);
                    const studentsInDept = Array.from(students.values()).filter((s: StudentInfo) => s.department === department).map((s: StudentInfo) => s.rollNumber);
                    
                    resolve(allConversations.filter(c => 
                        c.participantIds.some(id => staffInDept.includes(id) || studentsInDept.includes(id))
                    ));
                }
                else { // Teacher, Incharge
                    resolve(allConversations.filter(c => c.participantIds.includes(userId)));
                }
            }
        }, API_LATENCY);
    });
};

export const resetAdminPresenceOnLogin = (adminId: string): Promise<{ updatedAdmin: AdminInfo; updatedTimeTable: TimeTableEntry[] }> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const adminToUpdate = admins.get(adminId);
        if (!adminToUpdate) return reject(new Error("Admin not found."));

        // Only reset if they were previously marked as unavailable
        if (adminToUpdate.isPresentToday === false) {
             const updatedAdmin = { ...adminToUpdate, isPresentToday: true };
             admins.set(adminId, updatedAdmin);
             saveAdminDirectory(admins);

             // Update timetable
             const timetable = loadTimeTable();
             const now = new Date();
             const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

             const updatedTimeTable = timetable.map(entry => {
                 if (entry.teacherId === adminId && entry.dayOfWeek === dayOfWeek) {
                     return { ...entry, isAbsent: false };
                 }
                 return entry;
             });

             saveTimeTable(updatedTimeTable);
             resolve({ updatedAdmin, updatedTimeTable });
        } else {
             resolve({ updatedAdmin: adminToUpdate, updatedTimeTable: loadTimeTable() });
        }
    });
};

export const deleteSelf = (identifier: string, userType: 'STUDENT' | 'ADMIN', password: string): Promise<{ updatedStudents: Map<string, StudentInfo>; updatedAdmins: Map<string, AdminInfo>; updatedFaceLinks: Map<number, string>; updatedAttendance: AttendanceRecord[] }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (userType === 'STUDENT') {
                const students = loadStudentDirectory();
                const student = students.get(identifier);
                if (!student || student.password !== password) return reject(new Error("Invalid credentials."));

                students.delete(identifier);
                saveStudentDirectory(students);
                
                // Clean up associated data
                const links = loadFaceLinks();
                const attendance = loadAttendance();
                let pidToDelete: number | null = null;
                for (const [pid, rn] of links.entries()) {
                    if (rn === identifier) {
                        pidToDelete = pid;
                        break;
                    }
                }
                if (pidToDelete !== null) links.delete(pidToDelete);
                const newAttendance = attendance.filter(r => r.persistentId !== pidToDelete);
                saveFaceLinks(links);
                saveAttendance(newAttendance);

                resolve({ updatedStudents: students, updatedAdmins: loadAdminDirectory(), updatedFaceLinks: links, updatedAttendance: newAttendance });

            } else { // ADMIN
                const admins = loadAdminDirectory();
                const admin = admins.get(identifier);
                if (!admin || admin.password !== password) return reject(new Error("Invalid credentials."));
                
                // Prevent deletion of critical roles
                if ([Designation.Chairman, Designation.Principal].includes(admin.designation)) {
                    return reject(new Error("This critical role cannot be self-deleted."));
                }
                
                admins.delete(identifier);
                saveAdminDirectory(admins);

                resolve({ updatedStudents: loadStudentDirectory(), updatedAdmins: admins, updatedFaceLinks: loadFaceLinks(), updatedAttendance: loadAttendance() });
            }
        }, API_LATENCY);
    });
};

export const addDepartment = (name: string): Promise<string[]> => {
    return new Promise((resolve) => {
        const departments = loadDepartments();
        if (!departments.includes(name.trim())) {
            departments.push(name.trim());
            saveDepartments(departments);
        }
        resolve(departments);
    });
};

export const logAttendance = (persistentId: number, emotion: Emotion, subject?: string): Promise<AttendanceRecord[]> => {
    return new Promise((resolve) => {
        const attendance = loadAttendance();
        const newRecord: AttendanceRecord = {
            id: `att-${Date.now()}-${Math.random()}`,
            persistentId,
            timestamp: Date.now(),
            emotion,
            subject,
            status: 'present',
            source: 'AI',
        };
        attendance.push(newRecord);
        saveAttendance(attendance);
        resolve(attendance);
    });
};

export const setManualAttendance = (studentRollNumber: string, subject: string, date: Date, status: 'present' | 'absent', adminId: string): Promise<AttendanceRecord[]> => {
    return new Promise((resolve, reject) => {
        const links = loadFaceLinks();
        let persistentId: number | undefined;
        for (const [pid, roll] of links.entries()) {
            if (roll === studentRollNumber) {
                persistentId = pid;
                break;
            }
        }
        if (persistentId === undefined) return reject(new Error("Student face not linked, cannot set manual attendance."));

        const attendance = loadAttendance();
        const newRecord: AttendanceRecord = {
            id: `att-${Date.now()}-${Math.random()}`,
            persistentId,
            timestamp: date.getTime(),
            emotion: Emotion.Neutral, // Manual entry
            subject,
            status,
            source: 'Manual',
            markedBy: adminId,
        };
        attendance.push(newRecord);
        saveAttendance(attendance);
        logAdminAction(adminId, 'Manual Attendance', `Marked ${studentRollNumber} as ${status} for ${subject}.`);
        resolve(attendance);
    });
};

export const saveTimeTableEntries = (entries: TimeTableEntry[], adminId: string): Promise<TimeTableEntry[]> => {
    return new Promise((resolve) => {
        saveTimeTable(entries);
        logAdminAction(adminId, 'Update Timetable', `Saved ${entries.length} timetable entries.`);
        resolve(entries);
    });
};

export const updateTimeTableEntry = (entry: TimeTableEntry, adminId: string): Promise<TimeTableEntry[]> => {
    return new Promise((resolve) => {
        const timetable = loadTimeTable();
        const index = timetable.findIndex(e => e.id === entry.id);
        if (index > -1) {
            timetable[index] = entry;
        } else {
            timetable.push(entry);
        }
        saveTimeTable(timetable);
        logAdminAction(adminId, 'Update Timetable Entry', `Updated entry for ${entry.subject} at ${entry.startTime}.`);
        resolve(timetable);
    });
};

export const logGenericAdminAction = (adminId: string, action: string, details: string): void => {
    logAdminAction(adminId, action, details);
};

export const requestLeave = (teacherId: string, startDate: string, endDate: string, reason: string): Promise<LeaveRecord[]> => {
    return new Promise((resolve) => {
        const records = loadLeaveRecords();
        const newRecord: LeaveRecord = {
            id: `leave-${Date.now()}`,
            teacherId,
            startDate,
            endDate,
            reason,
            status: 'Pending',
            requestedAt: Date.now(),
        };
        records.push(newRecord);
        saveLeaveRecords(records);

        // Notify relevant admins
        const admins = loadAdminDirectory();
        const applicant = admins.get(teacherId);
        const approvers = Array.from(admins.values()).filter(a => [Designation.Principal, Designation.Chairman].includes(a.designation));
        
        if (applicant) {
            approvers.forEach(approver => {
                createNotification({
                    recipientId: approver.idNumber,
                    senderId: teacherId,
                    senderName: applicant.name,
                    type: 'LEAVE_REQUEST',
                    title: 'New Leave Request',
                    message: `${applicant.name} has requested leave from ${startDate} to ${endDate}.`,
                });
            });
        }
        
        resolve(records);
    });
};

export const cancelOwnLeave = (leaveId: string, userId: string): Promise<LeaveRecord[]> => {
    return new Promise((resolve, reject) => {
        let records = loadLeaveRecords();
        const record = records.find(r => r.id === leaveId);
        if (!record) return reject(new Error("Leave record not found."));
        if (record.teacherId !== userId) return reject(new Error("You can only cancel your own leave requests."));
        if (record.status !== 'Pending') return reject(new Error("Cannot cancel a request that has already been reviewed."));

        records = records.filter(r => r.id !== leaveId);
        saveLeaveRecords(records);
        resolve(records);
    });
};

export const approveLeave = (leaveId: string, adminId: string): Promise<{ updatedLeaveRecords: LeaveRecord[]; updatedTimeTable: TimeTableEntry[] }> => {
    return new Promise((resolve, reject) => {
        const records = loadLeaveRecords();
        const admins = loadAdminDirectory();
        const record = records.find(r => r.id === leaveId);
        if (!record) return reject(new Error("Leave record not found."));
        
        record.status = 'Approved';
        record.reviewedBy = adminId;
        record.reviewedAt = Date.now();
        saveLeaveRecords(records);
        logAdminAction(adminId, 'Approve Leave', `Approved leave for ${record.teacherId}.`);
        
        // Notify leadership
        const applicant = admins.get(record.teacherId);
        const leaders = Array.from(admins.values()).filter((a: AdminInfo) => [Designation.Principal, Designation.Chairman].includes(a.designation));
        if (applicant) {
            leaders.forEach((leader: AdminInfo) => sendLeaveNotificationEmail(leader.email, applicant.name, record.startDate, record.endDate));
        }

        // Notify applicant
        if (applicant) {
             sendLeaveStatusNotificationEmail(applicant.email, applicant.name, record.startDate, record.endDate, 'Approved');
        }

        // Update timetable
        const timetable = loadTimeTable();
        const leaveStart = new Date(record.startDate);
        const leaveEnd = new Date(record.endDate);
        const updatedTimeTable = timetable.map(entry => {
            if (entry.teacherId === record.teacherId) {
                // This is a simplification; a real app would need to check all dates in the range
                // For now, let's just mark the teacher as absent for the whole week for simplicity
                return { ...entry, isAbsent: true };
            }
            return entry;
        });
        saveTimeTable(updatedTimeTable);

        resolve({ updatedLeaveRecords: records, updatedTimeTable });
    });
};

export const rejectLeave = (leaveId: string, adminId: string): Promise<LeaveRecord[]> => {
    return new Promise((resolve, reject) => {
        const records = loadLeaveRecords();
        const admins = loadAdminDirectory();
        const record = records.find(r => r.id === leaveId);
        if (!record) return reject(new Error("Leave record not found."));
        
        record.status = 'Rejected';
        record.reviewedBy = adminId;
        record.reviewedAt = Date.now();
        saveLeaveRecords(records);
        logAdminAction(adminId, 'Reject Leave', `Rejected leave for ${record.teacherId}.`);

        // Notify applicant
        const applicant = admins.get(record.teacherId);
        if (applicant) {
             sendLeaveStatusNotificationEmail(applicant.email, applicant.name, record.startDate, record.endDate, 'Rejected');
        }
        resolve(records);
    });
};

export const grantHoliday = (startDate: string, endDate: string, reason: string, adminId: string): Promise<{ updatedHolidays: Holiday[]; updatedTimeTable: TimeTableEntry[] }> => {
    return new Promise(async (resolve, reject) => {
        const holidays = loadHolidays();
        const newHoliday: Holiday = {
            id: `hol-${Date.now()}`,
            startDate,
            endDate,
            reason,
            grantedBy: adminId,
        };
        holidays.push(newHoliday);
        saveHolidays(holidays);

        const timetable = loadTimeTable();
        const allAdmins = await getAdminDirectory();
        let updatedTimeTable = [...timetable];
        
        // Logic to cancel and attempt to reschedule classes
        const start = new Date(startDate);
        const end = new Date(endDate);
        let current = new Date(start);
        const rescheduledSummaries: string[] = [];

        while (current <= end) {
            const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
            const classesOnHoliday = updatedTimeTable.filter(e => e.dayOfWeek === dayOfWeek);

            for (const classEntry of classesOnHoliday) {
                const index = updatedTimeTable.findIndex(e => e.id === classEntry.id);
                if (index > -1) {
                    updatedTimeTable[index] = { ...classEntry, isCancelled: true, cancellationReason: `University Holiday: ${reason}` };
                    
                    // Attempt to reschedule
                    const rescheduleResult = await rescheduleClass(classEntry, updatedTimeTable, Array.from(allAdmins.values()), holidays, current);
                    if (rescheduleResult) {
                        const newEntryId = `${new Date(rescheduleResult.newDate).getDay()}-${rescheduleResult.newStartTime}-${classEntry.department}-${classEntry.year}-${classEntry.section}`;
                        const newEntry: TimeTableEntry = {
                            ...classEntry,
                            id: newEntryId,
                            dayOfWeek: new Date(rescheduleResult.newDate).getDay() === 0 ? 7 : new Date(rescheduleResult.newDate).getDay(),
                            startTime: rescheduleResult.newStartTime,
                            endTime: `${String(parseInt(rescheduleResult.newStartTime.split(':')[0]) + 1).padStart(2, '0')}:00`,
                            isCancelled: false,
                            cancellationReason: undefined,
                            rescheduledFrom: classEntry.id,
                        };
                        updatedTimeTable.push(newEntry);
                        rescheduledSummaries.push(`- ${classEntry.subject} for ${classEntry.department}/${classEntry.year} rescheduled to ${rescheduleResult.newDate} at ${rescheduleResult.newStartTime}.`);
                    } else {
                        rescheduledSummaries.push(`- ${classEntry.subject} for ${classEntry.department}/${classEntry.year} could not be automatically rescheduled.`);
                    }
                }
            }
            current.setDate(current.getDate() + 1);
        }

        saveTimeTable(updatedTimeTable);
        logAdminAction(adminId, 'Grant Holiday', `Granted holiday "${reason}" from ${startDate} to ${endDate}.`);

        // Create global notification by sending one to each user
        const adminName = allAdmins.get(adminId)?.name || 'Administration';
        const allStudents = await getStudentDirectory();

        for (const user of [...allStudents.values(), ...allAdmins.values()]) {
            const userId = 'rollNumber' in user ? user.rollNumber : user.idNumber;
            createNotification({
                recipientId: userId,
                senderId: adminId,
                senderName: adminName,
                type: 'ANNOUNCEMENT',
                title: 'Holiday Declared',
                message: `Holiday for "${reason}" from ${startDate} to ${endDate}.`,
            });
        }


        // Send priority messages to all students to appear on notice board
        const holidayMessage = `Holiday Declared: ${reason} from ${startDate} to ${endDate}. Check your timetable for rescheduled classes.`;
        for (const student of allStudents.values()) {
            await sendMessage(adminId, student.rollNumber, holidayMessage, undefined, true);
        }

        const summary = `Summary of rescheduled classes:\n${rescheduledSummaries.join('\n')}`;
        const hods = Array.from(allAdmins.values()).filter(a => a.designation === Designation.HOD);
        hods.forEach(hod => sendHolidayNotificationEmail(hod.email, startDate, endDate, reason, summary));

        resolve({ updatedHolidays: holidays, updatedTimeTable });
    });
};

export const cancelHoliday = (holidayId: string, adminId: string): Promise<{ updatedHolidays: Holiday[]; updatedTimeTable: TimeTableEntry[] }> => {
    return new Promise((resolve) => {
        const holidays = loadHolidays().filter(h => h.id !== holidayId);
        saveHolidays(holidays);

        // This is simplified; a real app would need a more robust way to restore cancelled classes.
        // For now, we'll just log it. A proper implementation would check `rescheduledFrom` and restore.
        logAdminAction(adminId, 'Cancel Holiday', `Cancelled holiday ID ${holidayId}. Manual timetable adjustment may be needed.`);

        resolve({ updatedHolidays: holidays, updatedTimeTable: loadTimeTable() });
    });
};

export const sendMessage = (senderId: string, receiverId: string, content: string, file?: { name: string; url: string }, isPriority?: boolean, suppressNotification?: boolean): Promise<Conversation[]> => {
    return new Promise(async (resolve) => {
        const conversations = loadConversations();
        const conversationId = [senderId, receiverId].sort().join('_');
        let convo = conversations.find(c => c.id === conversationId);

        const senderInfo = await getUserById(senderId);

        const newMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            senderId,
            timestamp: Date.now(),
            content,
            isPriority: isPriority && senderInfo?.userType === 'ADMIN',
            status: 'read',
            file,
        };

        if (convo) {
            convo.messages.push(newMessage);
            convo.lastUpdate = Date.now();
        } else {
            convo = {
                id: conversationId,
                participantIds: [senderId, receiverId].sort() as [string, string],
                messages: [newMessage],
                lastUpdate: Date.now(),
            };
            conversations.push(convo);
        }
        
        if (!suppressNotification && senderInfo) {
            createNotification({
                recipientId: receiverId,
                senderId: senderId,
                senderName: senderInfo.name,
                type: 'DIRECT_MESSAGE',
                title: `New Message from ${senderInfo.name}`,
                message: content ? (content.substring(0, 100) + (content.length > 100 ? '...' : '')) : (file ? `Sent: ${file.name}` : 'Sent an attachment.'),
                linkTo: `CHAT/${convo.id}/${newMessage.id}`
            });
        }

        saveConversations(conversations);
        resolve(conversations);
    });
};

export const sendBroadcast = async (adminId: string, target: string, title: string, message: string): Promise<void> => {
    return new Promise(async (resolve) => {
        const allAdmins = await getAdminDirectory();
        const allStudents = await getStudentDirectory();
        const sender = allAdmins.get(adminId);
        if (!sender) return resolve();

        const [targetType, ...params] = target.split('_');
        const recipientIds = new Set<string>();
        let audienceDescription = '';

        switch (targetType) {
            case 'STUDENT':
                let filteredStudents = Array.from(allStudents.values());
                let dept: string | undefined, year: string | undefined, sec: string | undefined;

                for (let i = 0; i < params.length; i += 2) {
                    if (params[i] === 'DEPT') dept = params[i+1];
                    if (params[i] === 'YEAR') year = params[i+1].replace(/-/g, ' ');
                    if (params[i] === 'SEC') sec = params[i+1];
                }
                
                if (dept) filteredStudents = filteredStudents.filter(s => s.department === dept);
                if (year) filteredStudents = filteredStudents.filter(s => s.year === year);
                if (sec) filteredStudents = filteredStudents.filter(s => s.section === sec);

                filteredStudents.forEach(s => recipientIds.add(s.rollNumber));
                audienceDescription = `Students in ${dept || 'All Depts'}${year ? `/${year}` : ''}${sec ? `/Sec ${sec}`: ''}`;
                break;

            case 'STAFF':
                let filteredAdmins = Array.from(allAdmins.values());
                if (params[0] === 'DEPT') {
                    const dept = params[1];
                    filteredAdmins = filteredAdmins.filter(a => a.department === dept);
                    audienceDescription = `Staff in ${dept}`;
                } else { // 'ALL'
                    audienceDescription = 'All Staff';
                }
                filteredAdmins.forEach(a => recipientIds.add(a.idNumber));
                break;

            case 'HOD':
                let hodAdmins = Array.from(allAdmins.values()).filter(a => a.designation === Designation.HOD);
                if (params[0] === 'DEPT') {
                    const dept = params[1];
                    hodAdmins = hodAdmins.filter(a => a.department === dept);
                    audienceDescription = `HOD of ${dept}`;
                } else { // 'ALL'
                    audienceDescription = 'All HODs';
                }
                hodAdmins.forEach(a => recipientIds.add(a.idNumber));
                break;
        }

        // Send primary notifications
        for (const id of recipientIds) {
            // Don't send to self as part of the main group
            if (id === adminId) continue;
            
            // This now creates a DM and a linked notification
            const messageContent = `[Broadcast: ${title}]\n\n${message}`;
            await sendMessage(adminId, id, messageContent, undefined, true, false);
        }

        // Send audit notifications to all other admins
        for (const anAdmin of allAdmins.values()) {
            if (anAdmin.idNumber === adminId) continue;
            
            // Avoid double-notifying if an admin was part of the primary recipient group
            if (recipientIds.has(anAdmin.idNumber)) continue;
            
            createNotification({
                recipientId: anAdmin.idNumber,
                senderId: adminId,
                senderName: sender.name,
                type: 'ANNOUNCEMENT',
                title: `Broadcast Sent to ${audienceDescription}`,
                message: `"${title}"`,
            });
        }
        
        logAdminAction(adminId, 'Send Broadcast', `Sent to "${audienceDescription}": ${title}`);
        resolve();
    });
};

export const createStudyGroup = (groupData: Omit<StudyGroup, 'id' | 'events' | 'messages'>): Promise<{ newGroup: StudyGroup, updatedStudents: Map<string, StudentInfo> }> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const newGroup: StudyGroup = {
            id: `group-${Date.now()}`,
            ...groupData,
            events: [],
            messages: [],
        };
        groups.push(newGroup);
        saveStudyGroups(groups);

        const students = loadStudentDirectory();
        
        // Add creator to members if not already there
        if (!newGroup.members.includes(newGroup.createdBy)) {
            newGroup.members.push(newGroup.createdBy);
        }

        // Send notifications to pending members
        if(newGroup.isPrivate && newGroup.pendingMembers) {
            const creator = students.get(newGroup.createdBy);
            newGroup.pendingMembers.forEach(pendingMemberId => {
                createNotification({
                    recipientId: pendingMemberId,
                    senderId: newGroup.createdBy,
                    senderName: creator?.name || 'A student',
                    type: 'GROUP_INVITE',
                    title: 'Study Group Invitation',
                    message: `You've been invited to join the private group "${newGroup.name}".`
                });
            });
        }
        
        // Update student records for creator. Invited members' records are not updated until they accept.
        const creator = students.get(newGroup.createdBy);
        if(creator) {
            if (!creator.studyGroupIds) creator.studyGroupIds = [];
            if (!creator.studyGroupIds.includes(newGroup.id)) {
                creator.studyGroupIds.push(newGroup.id);
            }
            students.set(newGroup.createdBy, creator);
        }

        saveStudentDirectory(students);
        resolve({ newGroup, updatedStudents: students });
    });
};

export const joinStudyGroup = (groupId: string, studentRollNumber: string): Promise<{ updatedGroup: StudyGroup, updatedStudent: StudentInfo }> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        const students = loadStudentDirectory();
        const student = students.get(studentRollNumber);

        if (!group) return reject(new Error("Group not found."));
        if (!student) return reject(new Error("Student not found."));

        const isInvited = group.pendingMembers?.includes(studentRollNumber);

        // Security Check: If group is public, user must be from the same department and year unless invited.
        if (!group.isPrivate && !isInvited && (group.department !== student.department || group.year !== student.year)) {
            return reject(new Error("You can only self-join groups from your own department and year. Ask for an invite to join other groups."));
        }

        // Security Check: If group is private, user must be invited.
        if (group.isPrivate && !isInvited) {
            return reject(new Error("This is a private group. You can only join via an invitation."));
        }
        
        if (group.members.length >= group.maxSize) return reject(new Error("Group is full."));
        if (group.members.includes(studentRollNumber)) {
             // If they are already a member but still in pending, just remove them from pending.
            if(isInvited) {
                group.pendingMembers = group.pendingMembers!.filter(id => id !== studentRollNumber);
                saveStudyGroups(groups);
            }
            // Technically not an error, but we can resolve without changing anything else.
            return resolve({ updatedGroup: group, updatedStudent: student });
        }
        
        // Add to members and remove from pending if they were invited
        group.members.push(studentRollNumber);
        if (isInvited) {
            group.pendingMembers = group.pendingMembers!.filter(id => id !== studentRollNumber);
        }
        saveStudyGroups(groups);
        
        if (!student.studyGroupIds) student.studyGroupIds = [];
        student.studyGroupIds.push(groupId);
        students.set(studentRollNumber, student);
        saveStudentDirectory(students);
        
        resolve({ updatedGroup: group, updatedStudent: student });
    });
};

export const sendGroupMessage = (groupId: string, senderId: string, content: string, file?: { name: string; url: string }, audio?: { url: string; duration: number }, replyToMessageId?: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));
        
        const newMessage: GroupChatMessage = {
            id: `gmsg-${Date.now()}`,
            senderId,
            timestamp: Date.now(),
            content,
            file,
            audio,
            replyToMessageId,
        };

        if (file) {
            if (!group.resources) {
                group.resources = [];
            }
            const newResource: GroupResource = {
                id: `res-${Date.now()}`,
                name: file.name,
                url: file.url,
                uploadedBy: senderId,
                uploadedAt: Date.now(),
            };
            group.resources.push(newResource);
        }

        group.messages.push(newMessage);
        saveStudyGroups(groups);
        resolve(group);
    });
};

export const deleteStudyGroup = (groupId: string, adminId: string): Promise<{ updatedGroups: StudyGroup[], updatedStudents: Map<string, StudentInfo> }> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        // Permission check
        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        if (!admin || !highPrivilegeRoles.includes(admin.designation)) {
            return reject(new Error("You do not have permission to delete study groups."));
        }

        const groups = loadStudyGroups();
        const groupToDelete = groups.find(g => g.id === groupId);
        if (!groupToDelete) return reject(new Error("Group not found."));

        const updatedGroups = groups.filter(g => g.id !== groupId);
        
        const students = loadStudentDirectory();
        groupToDelete.members.forEach(memberId => {
            const student = students.get(memberId);
            if (student && student.studyGroupIds) {
                student.studyGroupIds = student.studyGroupIds.filter(id => id !== groupId);
                students.set(memberId, student);
            }
        });
        
        saveStudyGroups(updatedGroups);
        saveStudentDirectory(students);
        logAdminAction(adminId, 'Delete Study Group', `Deleted group "${groupToDelete.name}" (ID: ${groupId})`);
        resolve({ updatedGroups, updatedStudents: students });
    });
};

export const deleteGroupResource = (groupId: string, resourceId: string, userId: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return reject(new Error("Group not found."));

        const group = groups[groupIndex];
        const resource = group.resources.find(r => r.id === resourceId);
        if (!resource) return reject(new Error("Resource not found."));

        const isUploader = resource.uploadedBy === userId;
        const isGroupAdmin = group.roles[userId] === 'admin';

        if (!isUploader && !isGroupAdmin) {
            return reject(new Error("You do not have permission to delete this resource."));
        }

        group.resources = group.resources.filter(r => r.id !== resourceId);
        groups[groupIndex] = group;
        saveStudyGroups(groups);
        resolve(group);
    });
};

export const deleteGroupMessage = (groupId: string, messageId: string, requestorId: string, deleteType: 'me' | 'everyone'): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex === -1) return reject(new Error("Group not found."));

        const group = groups[groupIndex];
        const messageIndex = group.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return reject(new Error("Message not found."));

        const message = group.messages[messageIndex];

        const isSender = message.senderId === requestorId;
        const isGroupAdmin = group.roles[requestorId] === 'admin';
        // Allow sender to delete for everyone within 1 hour, or admins anytime
        const isRecent = (Date.now() - message.timestamp) < 3600 * 1000;

        if (deleteType === 'everyone') {
            if (!isSender && !isGroupAdmin) {
                return reject(new Error("You do not have permission to delete this message for everyone."));
            }
            if (isSender && !isRecent && !isGroupAdmin) { // Senders can only delete recent, admins anytime
               return reject(new Error("You can only delete recent messages for everyone."));
            }
            // Soft delete
            message.isDeleted = true;
            message.content = "This message was deleted.";
            // Clear content to save space and remove sensitive info
            message.file = undefined;
            message.audio = undefined;
        } else { // deleteType === 'me'
            if (!message.deletedFor) {
                message.deletedFor = [];
            }
            if (!message.deletedFor.includes(requestorId)) {
                message.deletedFor.push(requestorId);
            }
        }

        group.messages[messageIndex] = message;
        groups[groupIndex] = group;
        saveStudyGroups(groups);
        resolve(group);
    });
};

export const uploadNote = (noteData: Omit<SharedNote, 'id' | 'ratings' | 'createdAt'>): Promise<SharedNote> => {
    return new Promise((resolve) => {
        const notes = loadSharedNotes();
        const newNote: SharedNote = {
            id: `note-${Date.now()}`,
            ...noteData,
            ratings: [],
            createdAt: Date.now(),
        };
        notes.push(newNote);
        saveSharedNotes(notes);
        resolve(newNote);
    });
};

export const rateNote = (noteId: string, rating: number, raterId: string): Promise<SharedNote> => {
    return new Promise((resolve, reject) => {
        const notes = loadSharedNotes();
        const note = notes.find(n => n.id === noteId);
        if (!note) return reject(new Error("Note not found."));
        
        const existingRatingIndex = note.ratings.findIndex(r => r.raterId === raterId);
        if (existingRatingIndex > -1) {
            note.ratings[existingRatingIndex].rating = rating;
        } else {
            note.ratings.push({ raterId, rating });
        }
        
        saveSharedNotes(notes);
        resolve(note);
    });
};

export const suggestStudyTime = async (groupId: string): Promise<{ dayOfWeek: number, startTime: string, reason: string }[]> => {
    const group = loadStudyGroups().find(g => g.id === groupId);
    if (!group) throw new Error("Group not found.");
    
    const allTimetables = loadTimeTable();
    const memberTimetables = group.members.map(memberId => ({
        memberId,
        schedule: allTimetables.filter(e => {
            const student = loadStudentDirectory().get(memberId);
            return student && e.department === student.department && e.year === student.year && e.section === student.section;
        })
    }));

    const result = await geminiSuggestStudyTime(memberTimetables, loadHolidays());
    return result.suggestions;
};

export const summarizeNote = async (noteId: string): Promise<string> => {
    const note = loadSharedNotes().find(n => n.id === noteId);
    if (!note) throw new Error("Note not found.");
    
    // Extract text content from data URL
    const [header, base64Data] = note.fileDataUrl.split(',');
    if (!base64Data) throw new Error("Invalid note file format.");

    try {
        const textContent = base64ToUtf8(base64Data);
        const result = await geminiSummarizeNote(textContent);
        return result.summary;
    } catch(e) {
        console.error(e);
        throw new Error("Could not decode or summarize note content.");
    }
};

export const getAttendanceAnomalies = async (studentsToAnalyze: StudentInfo[], attendance: AttendanceRecord[], faceLinks: Map<number, string>): Promise<AttendanceAnomaly[]> => {
    if (studentsToAnalyze.length === 0) return [];
    
    // Create context for each student
    const contextLines: string[] = [];
    studentsToAnalyze.forEach(student => {
        const pid = Array.from(faceLinks.entries()).find(([, roll]) => roll === student.rollNumber)?.[0];
        if (pid === undefined) return;
        
        const studentAttendance = attendance
            .filter(a => a.persistentId === pid)
            .sort((a,b) => a.timestamp - b.timestamp);

        if (studentAttendance.length === 0) return;
        
        contextLines.push(`--- Student: ${student.rollNumber} ---`);
        contextLines.push(`Name: ${student.name}`);
        const attendanceSummary = studentAttendance.map(a => `Date: ${new Date(a.timestamp).toISOString().split('T')[0]}, Subject: ${a.subject || 'N/A'}, Emotion: ${a.emotion}, Source: ${a.source}`).join('\n');
        contextLines.push(attendanceSummary);
        contextLines.push('\n');
    });

    if (contextLines.length === 0) return [];
    
    const result = await analyzeAttendanceAnomalies(contextLines.join('\n'));
    return result.anomalies;
};

export const pinMessage = (groupId: string, messageId: string, userId: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));
        if (group.roles[userId] !== 'admin') return reject(new Error("Only admins can pin messages."));

        const index = group.pinnedMessageIds.indexOf(messageId);
        if (index > -1) {
            group.pinnedMessageIds.splice(index, 1); // Unpin
        } else {
            group.pinnedMessageIds.push(messageId); // Pin
        }
        
        saveStudyGroups(groups);
        resolve(group);
    });
};

export const addTask = (groupId: string, task: Omit<GroupTask, 'id' | 'completed'>, userId: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));
        
        const newTask: GroupTask = {
            id: `task-${Date.now()}`,
            ...task,
            completed: false,
        };
        group.tasks.push(newTask);
        
        saveStudyGroups(groups);
        resolve(group);
    });
};

export const toggleTask = (groupId: string, taskId: string, userId: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));

        const task = group.tasks.find(t => t.id === taskId);
        if (!task) return reject(new Error("Task not found."));

        task.completed = !task.completed;
        task.completedBy = task.completed ? userId : undefined;

        saveStudyGroups(groups);
        resolve(group);
    });
};

export const deleteStudyGroupByStudent = (groupId: string, studentRollNumber: string): Promise<{ updatedGroups: StudyGroup[]; updatedStudents: Map<string, StudentInfo> }> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const allGroups = loadStudyGroups();
            const groupToDelete = allGroups.find(g => g.id === groupId);
    
            if (!groupToDelete) {
                return reject(new Error("Group not found."));
            }
    
            // Permission check: Only a group admin can delete the group.
            const isGroupAdmin = groupToDelete.roles?.[studentRollNumber] === 'admin';
            if (!isGroupAdmin) {
                return reject(new Error("Only group admins can delete the group."));
            }
    
            // Filter out the group to be deleted.
            const updatedGroups = allGroups.filter(g => g.id !== groupId);
            
            // Load the student directory to update member records.
            const students = loadStudentDirectory();
            
            // Iterate over each member of the deleted group and remove the group ID from their profile.
            groupToDelete.members.forEach(memberId => {
                const student = students.get(memberId);
                // Check if student exists and has a list of group IDs
                if (student?.studyGroupIds) {
                    // Create a new array of group IDs excluding the one being deleted
                    const newGroupIds = student.studyGroupIds.filter(id => id !== groupId);
                    // Update the student record in the map with the new group IDs list
                    students.set(memberId, { ...student, studyGroupIds: newGroupIds });
                }
            });
            
            // Save the updated lists to storage.
            saveStudyGroups(updatedGroups);
            saveStudentDirectory(students);
            
            // Resolve with the updated data.
            resolve({ updatedGroups, updatedStudents: students });
        }, API_LATENCY);
    });
};

export const declineStudyGroupInvitation = (groupId: string, studentRollNumber: string): Promise<{ updatedGroup: StudyGroup }> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));
        if (!group.pendingMembers?.includes(studentRollNumber)) {
            return reject(new Error("No invitation found for this user in this group."));
        }

        group.pendingMembers = group.pendingMembers.filter(id => id !== studentRollNumber);
        saveStudyGroups(groups);
        resolve({ updatedGroup: group });
    });
};

export const addMemberToStudyGroup = (groupId: string, studentRollNumber: string, requesterRollNumber: string): Promise<{ updatedGroup: StudyGroup; updatedStudentDirectory: Map<string, StudentInfo> }> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);

        if (!group) {
            return reject(new Error("Group not found."));
        }

        // Check permission: only group admin can add members
        if (group.roles[requesterRollNumber] !== 'admin') {
            return reject(new Error("Only group admins can add new members."));
        }

        if (group.members.length >= group.maxSize) {
            return reject(new Error("Group is already full."));
        }

        if (group.members.includes(studentRollNumber)) {
            return reject(new Error("This student is already a member of the group."));
        }
        
        const students = loadStudentDirectory();
        const studentToAdd = students.get(studentRollNumber);

        if (!studentToAdd) {
            return reject(new Error("Student to be added not found."));
        }

        // Add member to group
        group.members.push(studentRollNumber);
        if (!group.roles[studentRollNumber]) {
            group.roles[studentRollNumber] = 'member';
        }
        
        // Add group to student's list
        if (!studentToAdd.studyGroupIds) {
            studentToAdd.studyGroupIds = [];
        }
        studentToAdd.studyGroupIds.push(groupId);
        students.set(studentRollNumber, studentToAdd);

        saveStudyGroups(groups);
        saveStudentDirectory(students);

        resolve({ updatedGroup: group, updatedStudentDirectory: students });
    });
};

export const scheduleGroupEvent = (groupId: string, eventData: Omit<GroupEvent, 'id'>, creatorId: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));

        if (!group.members.includes(creatorId)) {
            return reject(new Error("Only group members can schedule events."));
        }
        
        const newEvent: GroupEvent = {
            id: `event-${Date.now()}`,
            ...eventData,
        };

        if (!group.events) {
            group.events = [];
        }
        group.events.push(newEvent);
        
        saveStudyGroups(groups);
        resolve(group);
    });
};

export const deleteGroupEvent = (groupId: string, eventId: string, requestorId: string): Promise<StudyGroup> => {
    return new Promise((resolve, reject) => {
        const groups = loadStudyGroups();
        const group = groups.find(g => g.id === groupId);
        if (!group) return reject(new Error("Group not found."));
        
        const isGroupAdmin = group.roles[requestorId] === 'admin';
        if (!isGroupAdmin) {
            return reject(new Error("Only group admins can delete events."));
        }

        group.events = group.events.filter(e => e.id !== eventId);
        
        saveStudyGroups(groups);
        resolve(group);
    });
};

// --- END OF ADDED FUNCTIONS ---

// --- Registration ---
export const registerStudent = (student: Omit<StudentInfo, 'blockExpiresAt' | 'isVerified' | 'blockedBy' | 'onboarded' | 'marks' | 'predictions'>): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const students = loadStudentDirectory();
                if (students.has(student.rollNumber)) {
                    return reject(new Error('A student with this Roll Number already exists.'));
                }
                // Check for duplicate email
                for (const s of students.values()) {
                    if (s.email.toLowerCase() === student.email.toLowerCase()) {
                       return reject(new Error('A student with this email address already exists.'));
                    }
                }
                
                const newStudent: StudentInfo = { 
                    ...student, 
                    marks: [], 
                    predictions: [],
                    blockExpiresAt: null, 
                    blockedBy: null, 
                    isVerified: false, 
                    onboarded: true, // User is onboarded as password and photo are set
                };
                students.set(newStudent.rollNumber, newStudent);
                saveStudentDirectory(students);
                
                const verificationToken = generateAndSaveVerificationToken(newStudent.rollNumber);
                await sendVerificationEmail(newStudent.email, verificationToken.token);
                
                resolve(newStudent);
            } catch(e) {
                reject(e);
            }
        }, API_LATENCY);
    });
};

export const registerStudentsBulk = (
    studentsData: Omit<StudentInfo, 'blockExpiresAt' | 'isVerified' | 'password' | 'blockedBy' | 'onboarded' | 'marks' | 'predictions'>[],
    adminId: string
): Promise<{ successful: StudentInfo[], failed: { studentData: any, reason: string }[] }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            const allUsers = [...Array.from(students.values()), ...Array.from(loadAdminDirectory().values())];
            const existingEmails = new Set(allUsers.map((u: StudentInfo | AdminInfo) => u.email.toLowerCase()));
            
            const successful: StudentInfo[] = [];
            const failed: { studentData: any, reason: string }[] = [];

            studentsData.forEach(student => {
                // Validation
                const upperRollNumber = student.rollNumber.toUpperCase();
                if (students.has(upperRollNumber)) {
                    failed.push({ studentData: student, reason: 'Roll Number already exists.' });
                    return;
                }
                if (existingEmails.has(student.email.toLowerCase())) {
                    failed.push({ studentData: student, reason: `Email ${student.email} already in use.` });
                    return;
                }

                // Create new student
                const newStudent: StudentInfo = {
                    ...student,
                    rollNumber: upperRollNumber,
                    password: `Pass@${upperRollNumber.slice(-4)}`, // Default password
                    marks: [],
                    predictions: [],
                    blockExpiresAt: null,
                    blockedBy: null,
                    isVerified: false,
                    onboarded: false,
                };
                students.set(newStudent.rollNumber, newStudent);
                existingEmails.add(newStudent.email.toLowerCase()); // Add to set to catch duplicates within the same file
                successful.push(newStudent);

                // Send verification email (fire and forget)
                const verificationToken = generateAndSaveVerificationToken(newStudent.rollNumber);
                sendVerificationEmail(newStudent.email, verificationToken.token);
            });

            saveStudentDirectory(students);
            logAdminAction(adminId, 'Bulk Student Registration', `Registered ${successful.length} new students. Failed: ${failed.length}.`);
            resolve({ successful, failed });
        }, API_LATENCY * 2); // A bit more latency for a bulk operation
    });
};

export const completeStudentOnboarding = (rollNumber: string, photoBase64: string, newPassword: string): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            const student = students.get(rollNumber.toUpperCase());
            if (!student) {
                return reject(new Error("Student not found during onboarding."));
            }
            student.photoBase64 = photoBase64;
            student.password = newPassword;
            student.onboarded = true;
            students.set(student.rollNumber, student);
            saveStudentDirectory(students);
            resolve(student);
        }, API_LATENCY);
    });
};


export const registerAdmin = (admin: Omit<AdminInfo, 'isVerified' | 'isBlocked'>): Promise<{ newAdmin: AdminInfo; updatedDepartments: string[] }> => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const admins = loadAdminDirectory();
                if (admins.has(admin.idNumber)) {
                    return reject(new Error('An admin with this ID Number already exists.'));
                }
                 // Check for duplicate email
                for (const a of admins.values()) {
                    if (a.email.toLowerCase() === admin.email.toLowerCase()) {
                        return reject(new Error('An admin with this email address already exists.'));
                    }
                }
                
                const departments = loadDepartments();
                if (admin.department && !departments.includes(admin.department)) {
                    departments.push(admin.department);
                    saveDepartments(departments);
                }
                
                const newAdmin: AdminInfo = { 
                    ...admin, 
                    isBlocked: false, 
                    isVerified: false, 
                    isPresentToday: true,
                };
                admins.set(newAdmin.idNumber, newAdmin);
                saveAdminDirectory(admins);

                const verificationToken = generateAndSaveVerificationToken(newAdmin.idNumber);
                await sendVerificationEmail(newAdmin.email, verificationToken.token);
                
                resolve({ newAdmin, updatedDepartments: departments });
            } catch(e) {
                reject(e);
            }
        }, API_LATENCY);
    });
};

// --- Verification ---
export const verifyUser = (identifier: string, token: string, userType: 'STUDENT' | 'ADMIN'): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const tokens = loadVerificationTokens();
            const storedToken = tokens.find(t => t.identifier === identifier && t.token === token);

            if (!storedToken) {
                return reject(new Error("Invalid verification code."));
            }
            if (storedToken.expiresAt < Date.now()) {
                return reject(new Error("Verification code has expired."));
            }

            if (userType === 'STUDENT') {
                const students = loadStudentDirectory();
                const student = students.get(identifier);
                if (student) {
                    student.isVerified = true;
                    students.set(identifier, student);
                    saveStudentDirectory(students);
                }
            } else {
                const admins = loadAdminDirectory();
                const admin = admins.get(identifier);
                if (admin) {
                    admin.isVerified = true;
                    admins.set(identifier, admin);
                    saveAdminDirectory(admins);
                }
            }
            
            // Remove the used token
            saveVerificationTokens(tokens.filter(t => t.token !== token));
            resolve();
        }, API_LATENCY);
    });
};

export const resendVerificationToken = (identifier: string, userType: 'STUDENT' | 'ADMIN'): Promise<void> => {
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            let userEmail: string | undefined;
            if (userType === 'STUDENT') {
                userEmail = loadStudentDirectory().get(identifier)?.email;
            } else {
                userEmail = loadAdminDirectory().get(identifier)?.email;
            }

            if (!userEmail) {
                return reject(new Error("User not found."));
            }

            const newVerificationToken = generateAndSaveVerificationToken(identifier);
            await sendVerificationEmail(userEmail, newVerificationToken.token);
            resolve();
        }, API_LATENCY);
    });
};


// --- Data Fetching ---
export const getStudentDirectory = (): Promise<Map<string, StudentInfo>> => {
    const students = loadStudentDirectory();
    // Helper function to create a demo student
    const createDemoStudent = (id: string, name: string, dept: string, year: Year, section: string, email: string) => {
        if (!students.has(id)) {
            const isFemale = ['Beth', 'Dana', 'Monica'].some(n => name.includes(n));
            students.set(id, {
                name: name,
                rollNumber: id,
                department: dept,
                year: year,
                section: section,
                email: email,
                password: 'student',
                phoneNumber: '9876543210',
                gender: isFemale ? Gender.Female : Gender.Male,
                blockExpiresAt: null,
                blockedBy: null,
                isVerified: true,
                onboarded: true,
                photoBase64: 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==',
                marks: [
                    { subject: 'Data Structures', mid1: 85, mid2: 78 },
                    { subject: 'Algorithms', mid1: 92, mid2: null },
                ],
                predictions: []
            });
            return true;
        }
        return false;
    };

    let hasChanged = false;
    if (createDemoStudent('DEMO-STUDENT', 'Demo Student', 'CSE', Year.Second, '1', 'student@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-2', 'Alex Ray', 'CSE', Year.Second, '1', 'alex@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-3', 'Beth Smith', 'CSE', Year.Second, '1', 'beth@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-4', 'Charlie Day', 'ECE', Year.Second, '1', 'charlie@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-5', 'Dana Scully', 'CSE', Year.Second, '1', 'dana@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-6', 'Fox Mulder', 'CSE', Year.Second, '1', 'fox@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-7', 'Walter Skinner', 'CSE', Year.Second, '1', 'walter@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-8', 'Monica Reyes', 'CSE', Year.Second, '1', 'monica@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-9', 'John Doggett', 'CSE', Year.Second, '1', 'john@kru.ac.in')) hasChanged = true;
    if (createDemoStudent('DEMO-STUDENT-10', 'Melvin Frohike', 'CSE', Year.Second, '1', 'melvin@kru.ac.in')) hasChanged = true;


    if (hasChanged) {
        saveStudentDirectory(students);
    }
    
    return Promise.resolve(students);
};

export const getAdminDirectory = (): Promise<Map<string, AdminInfo>> => {
    const admins = loadAdminDirectory();
    let hasChanged = false;

    // Create a default principal if none exist
    if (admins.size === 0) {
        const principal: AdminInfo = {
            name: 'Default Principal',
            idNumber: 'principal',
            password: 'admin',
            email: 'principal@kru.ac.in',
            department: 'Administration',
            designation: Designation.Principal,
            phoneNumber: '1234567890',
            gender: Gender.Male,
            isBlocked: false,
            isVerified: true, // Auto-verify the default admin
            isPresentToday: true,
        };
        const chairman: AdminInfo = {
            name: 'Default Chairman',
            idNumber: 'chairman',
            password: 'admin',
            email: 'chairman@kru.ac.in',
            department: 'Administration',
            designation: Designation.Chairman,
            phoneNumber: '1234567890',
            gender: Gender.Male,
            isBlocked: false,
            isVerified: true,
            isPresentToday: true,
        };
        admins.set(principal.idNumber, principal);
        admins.set(chairman.idNumber, chairman);
        hasChanged = true;
    }

     if (!admins.has('hod-cse')) {
        const hod: AdminInfo = {
            name: 'Demo HOD',
            idNumber: 'hod-cse',
            password: 'admin',
            email: 'hod.cse@kru.ac.in',
            department: 'CSE',
            designation: Designation.HOD,
            phoneNumber: '1112223333',
            gender: Gender.Male,
            isBlocked: false,
            isVerified: true,
            isPresentToday: true,
        };
        admins.set(hod.idNumber, hod);
        hasChanged = true;
    }
    
    if (!admins.has('teacher-ece')) {
        const teacher: AdminInfo = {
            name: 'Demo Teacher',
            idNumber: 'teacher-ece',
            password: 'admin',
            email: 'teacher.ece@kru.ac.in',
            department: 'ECE',
            designation: Designation.Teacher,
            phoneNumber: '4445556666',
            gender: Gender.Female,
            isBlocked: false,
            isVerified: true,
            isPresentToday: true,
        };
        admins.set(teacher.idNumber, teacher);
        hasChanged = true;
    }

    if (!admins.has('exams-office')) {
        const examsOffice: AdminInfo = {
            name: 'Exams Office',
            idNumber: 'exams-office',
            password: 'admin',
            email: 'exams@kru.ac.in',
            department: 'Administration',
            designation: Designation.ExamsOffice,
            phoneNumber: '9998887776',
            gender: Gender.Other,
            isBlocked: false,
            isVerified: true,
            isPresentToday: true,
        };
        admins.set(examsOffice.idNumber, examsOffice);
        hasChanged = true;
    }

    // Create 5 demo CSE teachers
    for (let i = 1; i <= 5; i++) {
        const teacherId = `teacher-cse-${i}`;
        if (!admins.has(teacherId)) {
            const teacher: AdminInfo = {
                name: `Demo CSE Teacher ${i}`,
                idNumber: teacherId,
                password: 'admin',
                email: `teacher.cse.${i}@kru.ac.in`,
                department: 'CSE',
                designation: Designation.Teacher,
                phoneNumber: `123123123${i}`,
                gender: i % 2 === 0 ? Gender.Female : Gender.Male,
                isBlocked: false,
                isVerified: true,
                isPresentToday: true,
            };
            admins.set(teacher.idNumber, teacher);
            hasChanged = true;
        }
    }

    // Create demo incharges for all years in CSE
    const years = Object.values(Year);
    years.forEach((year, index) => {
        const yearNumber = index + 1;
        const inchargeId = `incharge-cse-${yearNumber}y`;
        if (!admins.has(inchargeId)) {
            const incharge: AdminInfo = {
                name: `Demo Incharge (CSE ${year})`,
                idNumber: inchargeId,
                password: 'admin',
                email: `incharge.cse.${yearNumber}y@kru.ac.in`,
                department: 'CSE',
                designation: Designation.Incharge,
                year: year,
                section: 'All Sections', // For all sections of that year
                phoneNumber: `456456456${yearNumber}`,
                gender: yearNumber % 2 === 0 ? Gender.Female : Gender.Male,
                isBlocked: false,
                isVerified: true,
                isPresentToday: true,
            };
            admins.set(incharge.idNumber, incharge);
            hasChanged = true;
        }
    });

    if (hasChanged) {
        saveAdminDirectory(admins);
    }

    return Promise.resolve(admins);
};
export const getFaceLinks = (): Promise<Map<number, string>> => Promise.resolve(loadFaceLinks());
export const getAttendance = (): Promise<AttendanceRecord[]> => Promise.resolve(loadAttendance());
export const getDepartments = (): Promise<string[]> => Promise.resolve(loadDepartments());
export const getTimeTable = (): Promise<TimeTableEntry[]> => Promise.resolve(loadTimeTable());
export const getHolidays = (): Promise<Holiday[]> => Promise.resolve(loadHolidays());
export const getLeaveRecords = (): Promise<LeaveRecord[]> => Promise.resolve(loadLeaveRecords());

export const getStudyGroups = (): Promise<StudyGroup[]> => {
    let groups = loadStudyGroups();
    const students = loadStudentDirectory();
    let groupsChanged = false;
    let studentsChanged = false;

    const demoGroupId = 'group-1678886400000';
    let demoGroup = groups.find(g => g.id === demoGroupId);

    if (!demoGroup) {
        demoGroup = {
            id: demoGroupId,
            name: 'Testing Features Group',
            icon: '🧪',
            description: 'A group for testing chat features, polls, tasks, and more.',
            subject: 'General Testing',
            department: 'CSE',
            year: Year.Second,
            section: '1',
            members: [],
            maxSize: 8,
            createdBy: 'DEMO-STUDENT-2',
            isPrivate: false,
            events: [],
            messages: [],
            pinnedMessageIds: [],
            roles: {},
            tasks: [],
            resources: [],
        };
        groups.push(demoGroup);
        groupsChanged = true;
    }
    
    // ECE group
    const eceGroupId = 'group-ece-ninjas';
    if (!groups.some(g => g.id === eceGroupId)) {
        groups.push({
            id: eceGroupId,
            name: 'ECE Ninjas',
            icon: '⚡',
            description: 'A group for 3rd year ECE students to collaborate on projects.',
            subject: 'Microprocessors',
            department: 'ECE',
            year: Year.Third,
            section: '1',
            members: [],
            maxSize: 10,
            createdBy: 'DEMO-STUDENT-4', // An ECE student
            isPrivate: false,
            events: [], messages: [], pinnedMessageIds: [],
            roles: {}, tasks: [], resources: []
        });
        groupsChanged = true;
    }

    // 4th year CSE group
    const finalYearGroupId = 'group-final-year-cse';
    if (!groups.some(g => g.id === finalYearGroupId)) {
        groups.push({
            id: finalYearGroupId,
            name: 'Final Year Project Gurus',
            icon: '🏆',
            description: 'Collaboration and support for final year CSE projects.',
            subject: 'Major Project',
            department: 'CSE',
            year: Year.Fourth,
            section: '1',
            members: [],
            maxSize: 5,
            createdBy: 'DEMO-STUDENT-2',
            isPrivate: false,
            events: [], messages: [], pinnedMessageIds: [],
            roles: {}, tasks: [], resources: []
        });
        groupsChanged = true;
    }


    // --- Ensure Demo Group State is Correct ---
    const demoMembers = ['DEMO-STUDENT-2', 'DEMO-STUDENT-3']; // DEMO-STUDENT will be invited
    
    // Check members and update if necessary
    if (!demoMembers.every(m => demoGroup!.members.includes(m))) {
        demoGroup.members = demoMembers;
        groupsChanged = true;
    }

    // Check for messages and add them if they don't exist
    if (demoGroup.messages.length === 0) {
        demoGroup.messages = [
            {
                id: `msg-${Date.now() - 300000}`, // 5 mins ago
                senderId: 'DEMO-STUDENT-2',
                timestamp: Date.now() - 300000,
                content: "Hey everyone! Glad we could make this group. I'm struggling a bit with recursion, anyone have good resources?",
            },
            {
                id: `msg-${Date.now() - 180000}`, // 3 mins ago
                senderId: 'DEMO-STUDENT-3',
                timestamp: Date.now() - 180000,
                content: "Yeah, recursion can be tricky. I found a great YouTube playlist, I'll share the link.",
            },
            {
                id: `msg-${Date.now() - 120000}`, // 2 mins ago
                senderId: 'DEMO-STUDENT-3',
                timestamp: Date.now() - 120000,
                content: "Here it is.",
                file: { 
                    name: 'Recursion Explained.txt', 
                    // Base64 for: "This is a demo file with a link to a helpful video:\n\nhttps://www.youtube.com/watch?v=Mv9NEXX1VHc"
                    url: `data:text/plain;base64,${btoa("This is a demo file with a link to a helpful video:\n\nhttps://www.youtube.com/watch?v=Mv9NEXX1VHc")}` 
                }
            },
        ];

        if (!demoGroup.resources) demoGroup.resources = [];
        demoGroup.resources.push({
            id: `res-${Date.now() - 120000}`,
            name: 'Recursion Explained.txt',
            url: `data:text/plain;base64,${btoa("This is a demo file with a link to a helpful video:\n\nhttps://www.youtube.com/watch?v=Mv9NEXX1VHc")}`,
            uploadedBy: 'DEMO-STUDENT-3',
            uploadedAt: Date.now() - 120000
        });

        groupsChanged = true;
    }

    // --- Ensure Student Records Reflect Group Membership ---
    demoMembers.forEach(memberId => {
        const student = students.get(memberId);
        if (student) {
            if (!student.studyGroupIds) {
                student.studyGroupIds = [];
            }
            if (!student.studyGroupIds.includes(demoGroupId)) {
                student.studyGroupIds.push(demoGroupId);
                students.set(memberId, student);
                studentsChanged = true;
            }
        }
    });

    if (groupsChanged) {
        const groupIndex = groups.findIndex(g => g.id === demoGroupId);
        if (groupIndex !== -1) {
            groups[groupIndex] = demoGroup;
        }
        saveStudyGroups(groups);
    }
    if (studentsChanged) {
        saveStudentDirectory(students);
    }

    return Promise.resolve(groups);
};

export const getSharedNotes = (): Promise<SharedNote[]> => Promise.resolve(loadSharedNotes());

export const getAllUsersWithPhotos = (): Promise<{ id: string; photoBase64: string }[]> => {
    return new Promise((resolve) => {
        const students = loadStudentDirectory();
        const admins = loadAdminDirectory();
        const userProfiles: { id: string; photoBase64: string }[] = [];

        students.forEach((student, rollNumber) => {
            if (student.photoBase64 && student.isVerified && !(student.blockExpiresAt && student.blockExpiresAt > Date.now())) {
                userProfiles.push({ id: rollNumber, photoBase64: student.photoBase64 });
            }
        });

        admins.forEach((admin, idNumber) => {
            if (admin.photoBase64 && admin.isVerified && !admin.isBlocked) {
                userProfiles.push({ id: idNumber, photoBase64: admin.photoBase64 });
            }
        });
        resolve(userProfiles);
    });
};

export const getUserById = (id: string): Promise<(AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' }) | null> => {
     return new Promise((resolve) => {
        const adminUser = loadAdminDirectory().get(id);
        if (adminUser) {
            resolve({ ...adminUser, userType: 'ADMIN' });
            return;
        }
        const studentUser = loadStudentDirectory().get(id.toUpperCase());
        if (studentUser) {
            resolve({ ...studentUser, userType: 'STUDENT' });
            return;
        }
        resolve(null);
     });
};


// --- Data Mutation ---
export type MarkUpdate = {
    rollNumber: string;
    subject: string;
    midTerm: 'mid1' | 'mid2';
    marks: number | null;
};

export const updateBulkStudentMarks = (updates: MarkUpdate[], adminId: string): Promise<Map<string, StudentInfo>> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            
            updates.forEach(update => {
                const student = students.get(update.rollNumber);
                if (student) {
                    if (!student.marks) {
                        student.marks = [];
                    }
                    // Case-insensitive subject matching
                    let subjectMarks = student.marks.find(m => m.subject.toLowerCase() === update.subject.toLowerCase());
                    if (subjectMarks) {
                        subjectMarks[update.midTerm] = update.marks;
                    } else {
                        student.marks.push({
                            subject: update.subject,
                            mid1: update.midTerm === 'mid1' ? update.marks : null,
                            mid2: update.midTerm === 'mid2' ? update.marks : null,
                        });
                    }
                    students.set(student.rollNumber, student);
                }
            });

            saveStudentDirectory(students);
            logAdminAction(adminId, 'Bulk Marks Update', `Updated marks for ${updates.length} students. Subject: ${updates[0]?.subject || 'N/A'}`);
            resolve(students);
        }, API_LATENCY);
    });
};

export const linkFaceToStudent = (persistentId: number, rollNumber: string): Promise<Map<number, string>> => {
    return new Promise((resolve) => {
        const links = loadFaceLinks();
        links.set(persistentId, rollNumber);
        saveFaceLinks(links);
        resolve(links);
    });
};

export const verifyAndLinkNewFaceForStudent = (rollNumber: string, livePhotoBase64: string): Promise<Map<number, string>> => {
    return new Promise(async (resolve, reject) => {
        try {
            const students = loadStudentDirectory();
            const student = students.get(rollNumber.toUpperCase());
            if (!student) {
                return reject(new Error("Student profile not found."));
            }
            if (!student.photoBase64) {
                return reject(new Error("Your profile photo is missing. Please complete onboarding or contact an administrator."));
            }

            // Verify the live photo against the registered photo using Gemini
            const { matchedUserId, confidence } = await recognizeFace(livePhotoBase64, [{ id: rollNumber, photoBase64: student.photoBase64 }]);
            
            const confidenceThreshold = 0.75; // Use a reasonable threshold for self-verification
            if (matchedUserId !== rollNumber || confidence < confidenceThreshold) {
                return reject(new Error("Face does not match your registered profile. Please try again in a well-lit area."));
            }

            // Verification successful, now link the face.
            const links = loadFaceLinks();
            
            // Find and remove any existing links for this student to allow re-linking.
            const pidsToDelete: number[] = [];
            for (const [pid, rn] of links.entries()) {
                if (rn === rollNumber) {
                    pidsToDelete.push(pid);
                }
            }
            pidsToDelete.forEach(pid => links.delete(pid));

            // Generate a new persistent ID
            const existingIds = Array.from<number>(links.keys());
            const newId = existingIds.length > 0 ? Math.max(0, ...existingIds) + 1 : 1;
            
            links.set(newId, rollNumber);
            saveFaceLinks(links);
            resolve(links);

        } catch (err) {
            reject(err);
        }
    });
};

export const deleteStudent = (rollNumber: string, adminId: string): Promise<{updatedStudents: Map<string, StudentInfo>, updatedFaceLinks: Map<number, string>, updatedAttendance: AttendanceRecord[]}> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const students = loadStudentDirectory();
        const student = students.get(rollNumber);
        if (!student) return reject(new Error("Student to be deleted not found."));

        // PERMISSION CHECK
        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        if (highPrivilegeRoles.includes(admin.designation)) {
            // High privilege, allow action.
        } else if (admin.designation === Designation.HOD) {
            if (student.department !== admin.department) {
                return reject(new Error("HODs can only delete students from their own department."));
            }
        } else {
            return reject(new Error("You do not have permission to delete students."));
        }
        
        const links = loadFaceLinks();
        const attendance = loadAttendance();

        let persistentIdToDelete: number | null = null;
        for (const [pid, rn] of links.entries()) {
            if (rn === rollNumber) {
                persistentIdToDelete = pid;
                break;
            }
        }

        if (persistentIdToDelete !== null) {
            links.delete(persistentIdToDelete);
            saveFaceLinks(links);
        }
        
        const newAttendance = attendance.filter(record => record.persistentId !== persistentIdToDelete);
        saveAttendance(newAttendance);

        students.delete(rollNumber);
        saveStudentDirectory(students);
        logAdminAction(adminId, 'Delete Student', `Deleted student with Roll Number: ${rollNumber}`);
        
        resolve({ updatedStudents: students, updatedFaceLinks: links, updatedAttendance: newAttendance });
    });
};

export const deleteStudents = (rollNumbers: string[], adminId: string): Promise<{updatedStudents: Map<string, StudentInfo>, updatedFaceLinks: Map<number, string>, updatedAttendance: AttendanceRecord[]}> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));
        
        const students = loadStudentDirectory();
        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];

        rollNumbers.forEach(rollNumber => {
            const student = students.get(rollNumber);
            if (!student) return; // Skip if student doesn't exist

            if (!highPrivilegeRoles.includes(admin.designation)) {
                if (admin.designation === Designation.HOD && student.department !== admin.department) {
                    // Skip this student if HOD is from another department
                    return; 
                } else if (admin.designation !== Designation.HOD) {
                    // Skip if not HOD or high privilege
                    return;
                }
            }
            // If checks pass, proceed with marking for deletion
            students.delete(rollNumber);
        });

        const links = loadFaceLinks();
        const attendance = loadAttendance();
        const pidsToDelete = new Set<number>();
        rollNumbers.forEach(rollNumber => {
             for (const [pid, rn] of links.entries()) {
                if (rn === rollNumber) {
                    pidsToDelete.add(pid);
                }
            }
        });

        pidsToDelete.forEach(pid => links.delete(pid));
        const newAttendance = attendance.filter(record => !pidsToDelete.has(record.persistentId));
        
        saveStudentDirectory(students);
        saveFaceLinks(links);
        saveAttendance(newAttendance);

        logAdminAction(adminId, 'Bulk Delete Students', `Attempted to delete ${rollNumbers.length} students.`);
        resolve({ updatedStudents: students, updatedFaceLinks: links, updatedAttendance: newAttendance });
    });
};


export const blockStudent = (rollNumber: string, adminId: string, durationMs: number | 'PERMANENT'): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const students = loadStudentDirectory();
        const student = students.get(rollNumber);
        if (!student) return reject(new Error("Student not found"));

        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        if (!highPrivilegeRoles.includes(admin.designation)) {
            if (admin.designation === Designation.HOD && student.department !== admin.department) {
                return reject(new Error("HODs can only manage students in their own department."));
            } else if (admin.designation !== Designation.HOD) {
                return reject(new Error("You do not have permission to block students."));
            }
        }
       
        const newExpiry = durationMs === 'PERMANENT' ? Infinity : Date.now() + durationMs;
        const updatedStudent: StudentInfo = { ...student, blockExpiresAt: newExpiry, blockedBy: adminId };
        students.set(rollNumber, updatedStudent);
        saveStudentDirectory(students);
       
        const durationText = durationMs === 'PERMANENT' ? 'permanently' : `for ${durationMs / 1000 / 60} minutes`;
        logAdminAction(adminId, 'Block Student', `Blocked student ${rollNumber} ${durationText}`);
        resolve(updatedStudent);
    });
};

export const blockStudents = (rollNumbers: string[], adminId: string, durationMs: number | 'PERMANENT'): Promise<Map<string, StudentInfo>> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const students = loadStudentDirectory();
        const newExpiry = durationMs === 'PERMANENT' ? Infinity : Date.now() + durationMs;
        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];

        rollNumbers.forEach(rollNumber => {
            const student = students.get(rollNumber);
            if (!student) return;

             if (!highPrivilegeRoles.includes(admin.designation)) {
                if (admin.designation === Designation.HOD && student.department !== admin.department) {
                    return; 
                } else if (admin.designation !== Designation.HOD) {
                    return;
                }
            }

            student.blockExpiresAt = newExpiry;
            student.blockedBy = adminId;
            students.set(rollNumber, student);
        });

        saveStudentDirectory(students);
        const durationText = durationMs === 'PERMANENT' ? 'permanently' : `for ${durationMs / 1000 / 60} minutes`;
        logAdminAction(adminId, 'Bulk Block Students', `Blocked ${rollNumbers.length} students ${durationText}`);
        resolve(students);
    });
};


export const unblockStudent = (rollNumber: string, adminId: string): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
       const admins = loadAdminDirectory();
       const admin = admins.get(adminId);
       if (!admin) return reject(new Error("Admin performing action not found."));

       const students = loadStudentDirectory();
       const student = students.get(rollNumber);
       if (!student) return reject(new Error("Student not found"));

        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        if (!highPrivilegeRoles.includes(admin.designation)) {
            if (admin.designation === Designation.HOD && student.department !== admin.department) {
                return reject(new Error("HODs can only manage students in their own department."));
            } else if (admin.designation !== Designation.HOD) {
                return reject(new Error("You do not have permission to unblock students."));
            }
        }
       
       const updatedStudent: StudentInfo = { ...student, blockExpiresAt: null, blockedBy: null };
       students.set(rollNumber, updatedStudent);
       saveStudentDirectory(students);
       
       const adminName = admin.name || 'an Administrator';
       sendUnblockNotificationEmail(student.email, adminName, false);

       logAdminAction(adminId, 'Unblock Student', `Unblocked student ${rollNumber}`);
       resolve(updatedStudent);
    });
};

export const unblockStudents = (rollNumbers: string[], adminId: string): Promise<Map<string, StudentInfo>> => {
    return new Promise((resolve, reject) => {
       const admins = loadAdminDirectory();
       const admin = admins.get(adminId);
       if (!admin) return reject(new Error("Admin performing action not found."));

       const students = loadStudentDirectory();
       const adminName = admin.name || 'an Administrator';
       const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
       
       rollNumbers.forEach(rollNumber => {
            const student = students.get(rollNumber);
            if (!student) return;

             if (!highPrivilegeRoles.includes(admin.designation)) {
                if (admin.designation === Designation.HOD && student.department !== admin.department) {
                    return; 
                } else if (admin.designation !== Designation.HOD) {
                    return;
                }
            }

            student.blockExpiresAt = null;
            student.blockedBy = null;
            students.set(rollNumber, student);
            sendUnblockNotificationEmail(student.email, adminName, false);
       });
       
       saveStudentDirectory(students);
       logAdminAction(adminId, 'Bulk Unblock Students', `Unblocked ${rollNumbers.length} students`);
       resolve(students);
    });
};


export const deleteAdmin = (idNumber: string, adminId: string): Promise<Map<string, AdminInfo>> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));
        
        const adminToDelete = admins.get(idNumber);
        if (!adminToDelete) return reject(new Error("Admin to be deleted not found."));
        
        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];

        if (highPrivilegeRoles.includes(admin.designation)) {
            if ([Designation.Principal, Designation.Chairman].includes(adminToDelete.designation)) {
                return reject(new Error("This role cannot be deleted."));
            }
        } else {
            return reject(new Error("You do not have permission to delete admin accounts."));
        }

        admins.delete(idNumber);
        saveAdminDirectory(admins);
        logAdminAction(adminId, 'Delete Admin', `Deleted admin with ID Number: ${idNumber}`);
        resolve(admins);
    });
};

export const deleteAdmins = (idNumbers: string[], adminId: string): Promise<Map<string, AdminInfo>> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        let deletedCount = 0;
        
        idNumbers.forEach(idNumber => {
            const adminToDelete = admins.get(idNumber);
            if (!adminToDelete) return;

            let canDelete = false;
            if (highPrivilegeRoles.includes(admin.designation)) {
                if (![Designation.Principal, Designation.Chairman].includes(adminToDelete.designation)) {
                    canDelete = true;
                }
            }
            
            if (canDelete) {
                admins.delete(idNumber);
                deletedCount++;
            }
        });

        saveAdminDirectory(admins);
        logAdminAction(adminId, 'Bulk Delete Admins', `Deleted ${deletedCount} of ${idNumbers.length} selected admins.`);
        resolve(admins);
    });
};


export const toggleAdminBlock = (idNumber: string, adminId: string): Promise<AdminInfo> => {
     return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const adminToToggle = admins.get(idNumber);
        if (!adminToToggle) return reject(new Error("Admin to be toggled not found."));

        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        
        if (highPrivilegeRoles.includes(admin.designation)) {
            if ([Designation.Principal, Designation.Chairman].includes(adminToToggle.designation)) {
                return reject(new Error("This role's block status cannot be changed."));
            }
        } else {
            return reject(new Error("You do not have permission to block admin accounts."));
        }

        const updatedAdmin = { ...adminToToggle, isBlocked: !adminToToggle.isBlocked };
        admins.set(idNumber, updatedAdmin);
        saveAdminDirectory(admins);
        const action = updatedAdmin.isBlocked ? 'Block Admin' : 'Unblock Admin';
        logAdminAction(adminId, action, `Target ID Number: ${idNumber}`);
        resolve(updatedAdmin);
     });
};

export const toggleAdminsBlock = (idNumbers: string[], adminId: string, block: boolean): Promise<Map<string, AdminInfo>> => {
     return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        let toggledCount = 0;
        
        idNumbers.forEach(idNumber => {
            const adminToToggle = admins.get(idNumber);
            if (!adminToToggle) return;

            let canToggle = false;
            if (highPrivilegeRoles.includes(admin.designation)) {
                if (![Designation.Principal, Designation.Chairman].includes(adminToToggle.designation)) {
                    canToggle = true;
                }
            }
            
            if (canToggle) {
                adminToToggle.isBlocked = block;
                admins.set(idNumber, adminToToggle);
                toggledCount++;
            }
        });
        
        saveAdminDirectory(admins);
        const action = block ? 'Bulk Block Admins' : 'Bulk Unblock Admins';
        logAdminAction(adminId, action, `Toggled block status for ${toggledCount} of ${idNumbers.length} selected admins.`);
        resolve(admins);
     });
};


export const toggleAdminPresence = (idNumber: string, adminId: string): Promise<{ updatedAdmin: AdminInfo; updatedTimeTable: TimeTableEntry[] }> => {
    return new Promise((resolve, reject) => {
        const admins = loadAdminDirectory();
        const admin = admins.get(adminId);
        if (!admin) return reject(new Error("Admin performing action not found."));

        const adminToToggle = admins.get(idNumber);
        if (!adminToToggle) return reject(new Error("Admin to toggle not found"));

        // Permissions
        const highPrivilegeRoles = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal];
        if (!highPrivilegeRoles.includes(admin.designation)) {
             if (admin.designation === Designation.HOD) {
                 if (adminToToggle.department !== admin.department) {
                     return reject(new Error("HODs can only change presence for staff in their department."));
                 }
             } else if (admin.idNumber !== idNumber) { // Teachers/Incharges can only change their own presence
                 return reject(new Error("You can only change your own presence status."));
             }
        }
        
        if (adminToToggle.designation === Designation.Chairman) {
            return reject(new Error("Chairman presence cannot be changed."));
        }

        const updatedAdmin = { ...adminToToggle, isPresentToday: !(adminToToggle.isPresentToday ?? true) };
        admins.set(idNumber, updatedAdmin);
        saveAdminDirectory(admins);
        
        const action = updatedAdmin.isPresentToday ? 'Mark Present' : 'Mark Unavailable';
        logAdminAction(adminId, 'Toggle Presence', `${action} for ${adminToToggle.name} (${idNumber})`);
        
        // Update timetable based on presence
        const timetable = loadTimeTable();
        const now = new Date();
        const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

        const updatedTimeTable = timetable.map(entry => {
            if (entry.teacherId === idNumber && entry.dayOfWeek === dayOfWeek) {
                return { ...entry, isAbsent: !updatedAdmin.isPresentToday };
            }
            return entry;
        });

        saveTimeTable(updatedTimeTable);
        
        resolve({ updatedAdmin, updatedTimeTable });
    });
};

export const placePrediction = (rollNumber: string, subject: string, midTerm: 'mid1' | 'mid2', predictedMarks: number): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            const student = students.get(rollNumber);
            if (!student) return reject(new Error("Student not found."));

            if (!student.predictions) student.predictions = [];
            
            let predictionEntry = student.predictions.find(p => p.subject === subject);
            if (!predictionEntry) {
                predictionEntry = { subject, student_mid1_prediction: null, student_mid2_prediction: null, ai_mid1_prediction: null, ai_mid2_prediction: null };
                student.predictions.push(predictionEntry);
            }
            
            if (midTerm === 'mid1') {
                predictionEntry.student_mid1_prediction = predictedMarks;
            } else {
                predictionEntry.student_mid2_prediction = predictedMarks;
            }

            students.set(rollNumber, student);
            saveStudentDirectory(students);
            resolve(student);
        }, API_LATENCY);
    });
};

export const claimReward = (rollNumber: string, subject: string, midTerm: 'mid1' | 'mid2'): Promise<StudentInfo> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const students = loadStudentDirectory();
            const student = students.get(rollNumber);
            if (!student) return reject(new Error("Student not found."));

            const predictionEntry = student.predictions?.find(p => p.subject === subject);
            const marksEntry = student.marks?.find(m => m.subject === subject);

            if (!predictionEntry || !marksEntry) return reject(new Error("Cannot claim reward without marks and prediction."));
            
            const actualMark = midTerm === 'mid1' ? marksEntry.mid1 : marksEntry.mid2;
            const prediction = midTerm === 'mid1' ? predictionEntry.student_mid1_prediction : predictionEntry.student_mid2_prediction;
            const rewardClaimed = midTerm === 'mid1' ? predictionEntry.mid1_reward_claimed : predictionEntry.mid2_reward_claimed;

            if (actualMark === null || actualMark === undefined || prediction === null || prediction === undefined) {
                return reject(new Error("Marks are not yet entered for this exam."));
            }

            if (rewardClaimed) {
                return reject(new Error("Reward already claimed."));
            }
            
            const PREDICTION_RANGE = 5;
            const isWin = Math.abs(actualMark - prediction) <= PREDICTION_RANGE;

            if (isWin) {
                if (midTerm === 'mid1') {
                    predictionEntry.mid1_reward_claimed = true;
                } else {
                    predictionEntry.mid2_reward_claimed = true;
                }
                students.set(rollNumber, student);
                saveStudentDirectory(students);
                resolve(student);
            } else {
                return reject(new Error("Prediction was not within the winning range."));
            }
        }, API_LATENCY);
    });
};

export const queryKnowledgeBase = async (query: string): Promise<{ answer: string; sources: KnowledgeDocument[] }> => {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Retrieve relevant documents
            const relevantDocs = knowledgeBaseService.retrieveDocuments(query);

            if (relevantDocs.length === 0) {
                resolve({ 
                    answer: "I couldn't find any relevant information in the knowledge base to answer your question. Please try rephrasing it.",
                    sources: [] 
                });
                return;
            }

            // 2. Format context for the AI
            const context = relevantDocs.map(doc => 
                `--- Document: ${doc.title} ---\n${doc.content}\n--- End Document ---`
            ).join('\n\n');

            const systemInstruction = `You are a helpful university assistant. Answer the user's question based *only* on the provided documents. Be concise. If the answer is not in the documents, state that you cannot find the information in the provided context. Do not use outside knowledge. Do not list the titles of documents you used.`;

            // 3. Call the AI with the context and a specific system instruction
            const answer = await askAI(query, context, systemInstruction);

            // 4. Return the answer and sources
            resolve({ answer, sources: relevantDocs });

        } catch (error) {
            reject(error);
        }
    });
};