import { loadActionLogs, saveActionLogs } from './storageService';

export interface LogEntry {
    id: string;
    timestamp: number;
    adminId: string;
    action: string;
    details: string;
}

/**
 * Retrieves all action logs from storage.
 * @returns A promise that resolves to an array of LogEntry objects.
 */
export const getActionLogs = (): Promise<LogEntry[]> => {
    return Promise.resolve(loadActionLogs());
};

/**
 * Adds a new log entry to the action logs.
 * @param adminId The ID of the administrator performing the action.
 * @param action A short description of the action type (e.g., 'Delete Student').
 * @param details Specific details about the action (e.g., 'Deleted student with Roll Number: 12345').
 */
export const logAdminAction = (adminId: string, action: string, details: string): void => {
    try {
        const logs = loadActionLogs();
        const newLog: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            adminId,
            action,
            details,
        };
        logs.push(newLog);
        saveActionLogs(logs);
    } catch (error) {
        console.error("Failed to log admin action:", error);
    }
};