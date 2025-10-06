import React, { useState, useMemo } from 'react';
import { Holiday } from '../types';

interface HolidayManagementScreenProps {
    holidays: Holiday[];
    onGrantHoliday: (startDate: string, endDate: string, reason: string) => Promise<void>;
    onCancelHoliday: (holidayId: string) => Promise<void>;
    onBackToDashboard: () => void;
}

export const HolidayManagementScreen: React.FC<HolidayManagementScreenProps> = ({
    holidays,
    onGrantHoliday,
    onCancelHoliday,
    onBackToDashboard,
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
            await onGrantHoliday(startDate, endDate, reason.trim());
            setReason('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to grant holiday.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const sortedHolidays = useMemo(() => 
        [...holidays].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [holidays]);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col animate-slide-up p-4 sm:p-6 lg:p-8 h-screen">
            <header className="flex items-center w-full mb-6">
                 <button onClick={onBackToDashboard} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mx-auto">University Holiday Management</h1>
                <div className="w-10"></div>
            </header>
            <main className="w-full flex-grow">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">Declare University Holiday</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-1">Reason</label>
                                    <input type="text" id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Diwali Festival" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                                </div>
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
                                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                                <button type="submit" disabled={isLoading} className="w-full px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md disabled:opacity-50">
                                    {isLoading ? 'Processing...' : 'Grant Holiday & Reschedule Classes'}
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                            <h3 className="text-xl font-bold text-white mb-4">Declared Holidays</h3>
                            <div className="max-h-[60vh] overflow-y-auto">
                                {sortedHolidays.length === 0 ? (
                                    <p className="text-center text-gray-500 p-8">No holidays have been declared.</p>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr>
                                                <th className="p-2 text-sm font-semibold text-gray-400">Reason</th>
                                                <th className="p-2 text-sm font-semibold text-gray-400">Period</th>
                                                <th className="p-2 text-sm font-semibold text-gray-400">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {sortedHolidays.map(holiday => (
                                                <tr key={holiday.id}>
                                                    <td className="p-2 text-sm font-semibold text-white">{holiday.reason}</td>
                                                    <td className="p-2 text-sm text-gray-300">
                                                        {holiday.startDate}
                                                        {holiday.endDate !== holiday.startDate && ` to ${holiday.endDate}`}
                                                    </td>
                                                    <td className="p-2">
                                                        <button onClick={() => onCancelHoliday(holiday.id)} className="text-xs font-semibold text-red-400 hover:underline">Cancel</button>
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
            </main>
        </div>
    );
};