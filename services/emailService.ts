import { SimulatedEmail } from '../types';

let emailListener: ((email: SimulatedEmail) => void) | null = null;

/**
 * Sets a listener function to be called when an email is "sent".
 * This is used by the main App component to intercept emails and display them in the Mock Inbox.
 * @param listener The function to call with the simulated email details.
 */
export const setEmailListener = (listener: (email: SimulatedEmail) => void) => {
    emailListener = listener;
};

/**
 * Simulates sending a verification email to a user.
 * Instead of logging to the console, it now sends the email details to a listener,
 * which will display it in the Mock Inbox UI.
 * 
 * @param to The recipient's email address.
 * @param token The 6-digit verification token.
 */
export const sendVerificationEmail = (to: string, token: string): Promise<void> => {
    return new Promise((resolve) => {
        const email: SimulatedEmail = {
            to,
            subject: 'Verify Your Account for Krishna University',
            body: `Hello,\nThank you for registering. Please use the following code to verify your account:\n\nVerification Code: ${token}\n\nThis code will expire in 15 minutes.`,
            token,
        };

        if (emailListener) {
            emailListener(email);
        } else {
            // Fallback to console if no listener is set
            console.warn("--- SIMULATED EMAIL (No UI Listener) ---");
            console.warn(`To: ${to}\nToken: ${token}`);
            console.warn("---------------------------------------");
        }
        resolve();
    });
};

/**
 * Simulates sending a password reset email to a user.
 * Sends the email details to the Mock Inbox UI via the listener.
 * 
 * @param to The recipient's email address.
 * @param token The password reset token.
 */
export const sendPasswordResetEmail = (to: string, token: string): Promise<void> => {
    return new Promise((resolve) => {
        const email: SimulatedEmail = {
            to,
            subject: 'Password Reset Request for Krishna University',
            body: `Hello,\nYou requested a password reset. Here is your reset token (in a real app, this would be a link):\n\nReset Token: ${token}\n\nThis token will expire in 15 minutes.\nIf you did not request this, please ignore this email.`,
            token,
        };

        if (emailListener) {
            emailListener(email);
        } else {
             // Fallback to console if no listener is set
            console.warn("--- SIMULATED EMAIL (No UI Listener) ---");
            console.warn(`To: ${to}\nToken: ${token}`);
            console.warn("---------------------------------------");
        }
        resolve();
    });
};

/**
 * Simulates sending a notification to a student that their account has been unblocked.
 * @param to The student's email address.
 * @param adminName The name of the admin who unblocked them, or 'System' for automatic unblocks.
 * @param wasAutomatic True if the unblock was due to an expired temporary block.
 */
export const sendUnblockNotificationEmail = (to: string, adminName: string, wasAutomatic: boolean): Promise<void> => {
    return new Promise((resolve) => {
        const subject = 'Your Krishna University Account Access Has Been Restored';
        const body = wasAutomatic
            ? `Hello,\n\nYour temporary account block has expired. Full access to your account has been automatically restored.\n\nThank you,\nKrishna University System`
            : `Hello,\n\nYour account access has been restored by ${adminName}.\nYou may now log in and use the system as normal.\n\nThank you,\nKrishna University Administration`;
        
        const email: SimulatedEmail = {
            to,
            subject,
            body,
            token: '', // No token needed for this type of email
        };

        if (emailListener) {
            emailListener(email);
        } else {
            console.warn("--- SIMULATED EMAIL (No UI Listener) ---");
            console.warn(`To: ${to}\nSubject: ${subject}`);
            console.warn("---------------------------------------");
        }
        resolve();
    });
};

export const sendLeaveNotificationEmail = (to: string, teacherName: string, startDate: string, endDate: string): Promise<void> => {
    return new Promise((resolve) => {
        const subject = `Leave Granted: ${teacherName}`;
        const body = `Hello,\n\nPlease be advised that ${teacherName} has been granted leave from ${startDate} to ${endDate}.\n\nThe system has attempted to automatically re-assign their classes. Please review the timetable for any required manual adjustments.\n\nThank you,\nKrishna University Automated System`;
        
        const email: SimulatedEmail = {
            to,
            subject,
            body,
            token: '',
        };

        if (emailListener) {
            emailListener(email);
        } else {
            console.warn("--- SIMULATED EMAIL (No UI Listener) ---");
            console.warn(`To: ${to}\nSubject: ${subject}`);
            console.warn("---------------------------------------");
        }
        resolve();
    });
};

export const sendLeaveStatusNotificationEmail = (to: string, teacherName: string, startDate: string, endDate: string, status: 'Approved' | 'Rejected'): Promise<void> => {
    return new Promise((resolve) => {
        const subject = `Your Leave Request has been ${status}`;
        const body = `Hello ${teacherName},\n\nYour leave request from ${startDate} to ${endDate} has been ${status}.\n\nThank you,\nKrishna University Administration`;
        
        const email: SimulatedEmail = {
            to,
            subject,
            body,
            token: '',
        };

        if (emailListener) {
            emailListener(email);
        }
        resolve();
    });
};

export const sendHolidayNotificationEmail = (to: string, startDate: string, endDate: string, reason: string, summary: string): Promise<void> => {
    return new Promise((resolve) => {
        const subject = `University Holiday Declared: ${reason}`;
        const body = `Hello Head of Department,\n\nPlease be advised that a university holiday has been declared for "${reason}" from ${startDate} to ${endDate}.\n\n${summary}\n\nPlease review your department's timetable for these changes.\n\nThank you,\nKrishna University Automated System`;
        
        const email: SimulatedEmail = {
            to,
            subject,
            body,
            token: '',
        };

        if (emailListener) {
            emailListener(email);
        } else {
            console.warn("--- SIMULATED EMAIL (No UI Listener) ---");
            console.warn(`To: ${to}\nSubject: ${subject}`);
            console.warn("---------------------------------------");
        }
        resolve();
    });
};