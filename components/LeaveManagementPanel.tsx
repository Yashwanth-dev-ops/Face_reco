import React, { useMemo, useState } from 'react';
import { LeaveRecord, AdminInfo, Designation } from '../types';

interface LeaveManagementPanelProps {
    currentUser: AdminInfo;
    allAdmins: AdminInfo[];
    leaveRecords: LeaveRecord[];
    onApproveLeave: (leaveId: string) => Promise<void>;
    onRejectLeave: (leaveId: string) => Promise<void>;
}

export const LeaveManagementPanel: React.FC<LeaveManagementPanelProps> = ({
    currentUser,
    allAdmins,
    leaveRecords,
    onApproveLeave,
    onRejectLeave,
}) => {
    const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

    const { pending, reviewed } = useMemo(() => {
        const pending: LeaveRecord[] = [];
        const reviewed: LeaveRecord[] = [];

        const isChairman = currentUser.designation === Designation.Chairman;
        const isPrincipal = currentUser.designation === Designation.Principal;

        leaveRecords.forEach(record => {
            // Don't show your own requests in the approval panel
            if (record.teacherId === currentUser.idNumber) {
                if (record.status !== 'Pending') {
                    reviewed.push(record);
                }
                return;
            }

            const applicant = allAdmins.find(a => a.idNumber === record.teacherId);
            if (!applicant) return; // Skip if applicant not found

            let isVisibleForApproval = false;
            if (isChairman) {
                // Chairman can see everyone's requests (except their own)
                isVisibleForApproval = true;
            } else if (isPrincipal) {
                // Principal can see requests from Teachers, HODs, Incharges
                const canApproveRoles = [Designation.Teacher, Designation.HOD, Designation.Incharge];
                if (canApproveRoles.includes(applicant.designation)) {
                    isVisibleForApproval = true;
                }
            }

            if (record.status === 'Pending' && isVisibleForApproval) {
                pending.push(record);
            } else if (record.status !== 'Pending') {
                reviewed.push(record);
            }
        });

        return {
            pending: pending.sort((a, b) => a.requestedAt - b.requestedAt),
            reviewed: reviewed.sort((a, b) => (b.reviewedAt ?? 0) - (a.reviewedAt ?? 0)),
        };
    }, [leaveRecords, currentUser, allAdmins]);

    const handleAction = async (action: 'approve' | 'reject', leaveId: string) => {
        setIsLoading(prev => ({ ...prev, [leaveId]: true }));
        try {
            if (action === 'approve') {
                await onApproveLeave(leaveId);
            } else {
                await onRejectLeave(leaveId);
            }
        } catch (error) {
            console.error(`Failed to ${action} leave:`, error);
        } finally {
            setIsLoading(prev => ({ ...prev, [leaveId]: false }));
        }
    };

    const getStatusChip = (status: 'Pending' | 'Approved' | 'Rejected') => {
        switch (status) {
            case 'Approved': return <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full dark:bg-green-900 dark:text-green-300">Approved</span>;
            case 'Rejected': return <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded-full dark:bg-red-900 dark:text-red-300">Rejected</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Pending Leave Requests</h3>
                <div className="max-h-[60vh] overflow-auto custom-scrollbar">
                    {pending.length === 0 ? (
                        <p className="text-center text-gray-500 p-8">No pending leave requests to review.</p>
                    ) : (
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="sticky top-0 bg-gray-800/80 backdrop-blur-sm">
                                <tr>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Staff Member</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Period</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Reason</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {pending.map(record => {
                                    const teacher = allAdmins.find(a => a.idNumber === record.teacherId);
                                    return (
                                        <tr key={record.id}>
                                            <td className="p-2 text-sm text-white">{teacher?.name || record.teacherId} <span className="text-gray-400">({teacher?.designation})</span></td>
                                            <td className="p-2 text-sm text-gray-300">{record.startDate} to {record.endDate}</td>
                                            <td className="p-2 text-sm text-gray-400 italic">"{record.reason}"</td>
                                            <td className="p-2 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={() => handleAction('approve', record.id)} disabled={isLoading[record.id]} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-500 disabled:opacity-50">Approve</button>
                                                    <button onClick={() => handleAction('reject', record.id)} disabled={isLoading[record.id]} className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded hover:bg-red-500 disabled:opacity-50">Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
            
            <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Reviewed Leave History</h3>
                 <div className="max-h-[60vh] overflow-auto custom-scrollbar">
                    {reviewed.length === 0 ? (
                        <p className="text-center text-gray-500 p-8">No reviewed leave records found.</p>
                    ) : (
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="sticky top-0 bg-gray-800/80 backdrop-blur-sm">
                                <tr>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Staff Member</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Period</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Reviewed By</th>
                                    <th className="p-2 text-sm font-semibold text-gray-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {reviewed.map(record => {
                                    const teacher = allAdmins.find(a => a.idNumber === record.teacherId);
                                    const reviewer = allAdmins.find(a => a.idNumber === record.reviewedBy);
                                    return (
                                        <tr key={record.id} className="opacity-70">
                                            <td className="p-2 text-sm text-white">{teacher?.name || record.teacherId}</td>
                                            <td className="p-2 text-sm text-gray-300">{record.startDate} to {record.endDate}</td>
                                            <td className="p-2 text-sm text-gray-400">{reviewer?.name || record.reviewedBy}</td>
                                            <td className="p-2">{getStatusChip(record.status)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                 </div>
            </div>
        </div>
    );
};