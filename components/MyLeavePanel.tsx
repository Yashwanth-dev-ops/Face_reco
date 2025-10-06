import React, { useState, useMemo } from 'react';
import { LeaveRecord, AdminInfo } from '../types';

interface MyLeavePanelProps {
    currentUser: AdminInfo;
    leaveRecords: LeaveRecord[];
    onRequestLeave: (startDate: string, endDate: string, reason: string) => Promise<void>;
    onCancelOwnLeave: (leaveId: string) => Promise<void>;
}

export const MyLeavePanel: React.FC<MyLeavePanelProps> = ({
    currentUser,
    leaveRecords,
    onRequestLeave,
    onCancelOwnLeave,
}) => {
    const [reason, setReason] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!reason.trim() || !startDate || !endDate) {
            setError('All fields are required.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date cannot be after end date.');
            return;
        }
        setIsLoading(true);
        try {
            await onRequestLeave(startDate, endDate, reason.trim());
            setReason('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit leave request.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const myLeaveRecords = useMemo(() => 
        [...leaveRecords]
            .filter(r => r.teacherId === currentUser.idNumber)
            .sort((a, b) => b.requestedAt - a.requestedAt),
    [leaveRecords, currentUser.idNumber]);

    const getStatusChip = (status: 'Pending' | 'Approved' | 'Rejected') => {
        switch (status) {
            case 'Pending': return <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-200 rounded-full dark:bg-yellow-900 dark:text-yellow-300">Pending</span>;
            case 'Approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full dark:bg-green-900 dark:text-green-300">Approved</span>;
            case 'Rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full dark:bg-red-900 dark:text-red-300">Rejected</span>;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">Apply for Leave</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                                <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                            </div>
                            <div>
                                <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                                <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                            <textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" placeholder="e.g., Personal reason"></textarea>
                        </div>
                        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                        <button type="submit" disabled={isLoading} className="w-full px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md disabled:opacity-50">
                            {isLoading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2">
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">My Leave History</h3>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {myLeaveRecords.length === 0 ? (
                            <p className="text-center text-gray-500 p-8">You have not requested any leave.</p>
                        ) : (
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <th className="p-2 text-sm font-semibold text-gray-400">Period</th>
                                        <th className="p-2 text-sm font-semibold text-gray-400">Status</th>
                                        <th className="p-2 text-sm font-semibold text-gray-400">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700/50">
                                    {myLeaveRecords.map(record => (
                                        <tr key={record.id}>
                                            <td className="p-2 text-sm text-gray-300">{record.startDate} to {record.endDate}</td>
                                            <td className="p-2">{getStatusChip(record.status)}</td>
                                            <td className="p-2">
                                                {record.status === 'Pending' && (
                                                    <button onClick={() => onCancelOwnLeave(record.id)} className="text-xs font-semibold text-red-400 hover:underline">Cancel</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};