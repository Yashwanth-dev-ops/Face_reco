import React, { useState, useEffect, useMemo } from 'react';
import { getActionLogs } from '../services/logService';
import { LogEntry } from '../services/logService';
import { AdminInfo } from '../types';

interface LogPanelProps {
    adminDirectory: Map<string, AdminInfo>;
}

const exportLogsToCSV = (logs: LogEntry[], adminDirectory: Map<string, AdminInfo>) => {
    const headers = ['Timestamp', 'Admin Name', 'Admin ID', 'Action', 'Details'];
    
    const rows = logs.map(log => {
        const admin = adminDirectory.get(log.adminId);
        const adminName = admin ? admin.name : 'Unknown';
        const timestamp = new Date(log.timestamp).toLocaleString();
        
        return [
            `"${timestamp}"`,
            `"${adminName}"`,
            `"${log.adminId}"`,
            `"${log.action}"`,
            `"${log.details.replace(/"/g, '""')}"`
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'admin_action_logs.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const LogPanel: React.FC<LogPanelProps> = ({ adminDirectory }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const actionLogs = await getActionLogs();
            // Sort logs by newest first
            setLogs(actionLogs.sort((a, b) => b.timestamp - a.timestamp));
            setLoading(false);
        };
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        if (!filter) return logs;
        const lowercasedFilter = filter.toLowerCase();
        return logs.filter(log => {
            const admin = adminDirectory.get(log.adminId);
            return (
                log.action.toLowerCase().includes(lowercasedFilter) ||
                log.details.toLowerCase().includes(lowercasedFilter) ||
                log.adminId.toLowerCase().includes(lowercasedFilter) ||
                (admin && admin.name.toLowerCase().includes(lowercasedFilter))
            );
        });
    }, [logs, filter, adminDirectory]);

    if (loading) {
        return <div className="text-center p-8">Loading logs...</div>;
    }

    return (
        <div className="bg-slate-900/50 p-6 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-indigo-300">Administrator Action Logs ({filteredLogs.length})</h2>
                 <div className="flex gap-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="w-full sm:w-64 bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <button
                        onClick={() => exportLogsToCSV(filteredLogs, adminDirectory)}
                        disabled={filteredLogs.length === 0}
                        className="px-4 py-2 rounded-md font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Export CSV
                    </button>
                </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto border border-slate-700 rounded-lg">
                {filteredLogs.length === 0 ? (
                    <p className="text-center text-gray-500 p-8">No action logs found.</p>
                ) : (
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-900 z-10">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-400">Timestamp</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Admin</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Action</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredLogs.map(log => {
                                const admin = adminDirectory.get(log.adminId);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-800/60">
                                        <td className="p-3 text-sm text-gray-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-sm text-white">
                                            <p className="font-semibold">{admin ? admin.name : 'Unknown Admin'}</p>
                                            <p className="text-xs text-gray-500 font-mono">{log.adminId}</p>
                                        </td>
                                        <td className="p-3 text-sm text-indigo-300 font-semibold">
                                            {log.action}
                                        </td>
                                        <td className="p-3 text-sm text-gray-300">
                                            {log.details}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};