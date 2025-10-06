


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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [adminFilter, setAdminFilter] = useState('ALL');

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
        return logs.filter(log => {
            // Text filter
            const lowercasedFilter = filter.toLowerCase();
            const admin = adminDirectory.get(log.adminId);
            const matchesText = filter === '' || (
                log.action.toLowerCase().includes(lowercasedFilter) ||
                log.details.toLowerCase().includes(lowercasedFilter) ||
                log.adminId.toLowerCase().includes(lowercasedFilter) ||
                (admin && admin.name.toLowerCase().includes(lowercasedFilter))
            );

            // Admin filter
            const matchesAdmin = adminFilter === 'ALL' || log.adminId === adminFilter;

            // Date filter
            const logDate = new Date(log.timestamp);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            if (start) start.setHours(0, 0, 0, 0); // Start of day
            if (end) end.setHours(23, 59, 59, 999); // End of day

            const matchesDate = (!start || logDate >= start) && (!end || logDate <= end);

            return matchesText && matchesAdmin && matchesDate;
        });
    }, [logs, filter, adminFilter, startDate, endDate, adminDirectory]);

    const clearFilters = () => {
        setFilter('');
        setStartDate('');
        setEndDate('');
        setAdminFilter('ALL');
    };

    if (loading) {
        return <div className="text-center p-8">Loading logs...</div>;
    }

    return (
        <div className="bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-white">Administrator Action Logs ({filteredLogs.length})</h2>
                 <div className="flex gap-2">
                    <button
                        onClick={clearFilters}
                        className="px-4 py-2 rounded-lg font-semibold text-white bg-gray-600 hover:bg-gray-500 transition-all shadow-lg"
                    >
                        Clear Filters
                    </button>
                    <button
                        onClick={() => exportLogsToCSV(filteredLogs, adminDirectory)}
                        disabled={filteredLogs.length === 0}
                        className="px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        Export CSV
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                <input
                    type="text"
                    placeholder="Search action/details..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white transition"
                />
                <select
                    value={adminFilter}
                    onChange={e => setAdminFilter(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white transition"
                >
                    <option value="ALL">All Admins</option>
                    {/* FIX: Add explicit type to map callback parameter to avoid 'unknown' type inference. */}
                    {Array.from(adminDirectory.values()).map((admin: AdminInfo) => (
                        <option key={admin.idNumber} value={admin.idNumber}>{admin.name}</option>
                    ))}
                </select>
                <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white transition"
                    aria-label="Start Date"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white transition"
                    aria-label="End Date"
                />
            </div>
            <div className="max-h-[70vh] overflow-auto custom-scrollbar border border-gray-700/50 rounded-lg">
                {filteredLogs.length === 0 ? (
                    <div className="text-center text-gray-500 p-8 h-64 flex flex-col justify-center items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        <p className="mt-4">No action logs found for the selected filters.</p>
                    </div>
                ) : (
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="sticky top-0 bg-gray-800 z-10">
                            <tr>
                                <th className="p-3 text-sm font-semibold text-gray-400">Timestamp</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Admin</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Action</th>
                                <th className="p-3 text-sm font-semibold text-gray-400">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/50">
                            {filteredLogs.map(log => {
                                const admin = adminDirectory.get(log.adminId);
                                return (
                                    <tr key={log.id} className="hover:bg-gray-700/50">
                                        <td className="p-3 text-sm text-gray-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-sm text-white">
                                            <p className="font-semibold">{admin ? admin.name : 'Unknown Admin'}</p>
                                            <p className="text-xs text-gray-500 font-mono">{log.adminId}</p>
                                        </td>
                                        <td className="p-3 text-sm text-blue-300 font-semibold">
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