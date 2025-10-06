
import React, { useState, useEffect, useMemo } from 'react';
import { TimeTableEntry, AdminInfo, Designation } from '../types';
import * as geminiService from '../services/geminiService';
import { SparklesIcon } from './SparklesIcon';

interface SubstituteSuggestionModalProps {
    entry: TimeTableEntry;
    onClose: () => void;
    onSelectSubstitute: (entry: TimeTableEntry, newTeacherId: string) => void;
    allTeachers: AdminInfo[];
    fullTimeTable: TimeTableEntry[];
}

const LoadingSpinner: React.FC = () => (
    <div className="w-8 h-8 border-4 border-t-4 border-gray-200 border-t-blue-400 rounded-full animate-spin"></div>
);

export const SubstituteSuggestionModal: React.FC<SubstituteSuggestionModalProps> = ({
    entry,
    onClose,
    onSelectSubstitute,
    allTeachers,
    fullTimeTable
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [suggestion, setSuggestion] = useState<{ suggestedTeacherId: string; reason: string } | null>(null);
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

    const availableTeachers = useMemo(() => {
        const teachersWithCorrectDesignation = allTeachers.filter(t => [Designation.Teacher, Designation.Incharge].includes(t.designation));

        return teachersWithCorrectDesignation.filter(teacher => {
            if (teacher.idNumber === entry.teacherId) return false;

            const isBusy = fullTimeTable.some(e => 
                !e.isAbsent &&
                e.teacherId === teacher.idNumber &&
                e.dayOfWeek === entry.dayOfWeek &&
                e.startTime === entry.startTime
            );
            return !isBusy;
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [allTeachers, fullTimeTable, entry]);

    useEffect(() => {
        const fetchSuggestion = async () => {
            setIsLoading(true);
            setError(null);
            setSuggestion(null);
            setSelectedTeacherId('');

            if (availableTeachers.length === 0) {
                setError("No available teachers were found for this time slot.");
                setIsLoading(false);
                return;
            }

            try {
                const result = await geminiService.suggestSubstituteTeacher(entry, availableTeachers, fullTimeTable);
                if (result) {
                    setSuggestion(result);
                    setSelectedTeacherId(result.suggestedTeacherId);
                } else {
                    setError("AI could not make a suggestion. Please select manually.");
                    if(availableTeachers.length > 0) setSelectedTeacherId(availableTeachers[0].idNumber);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "An unexpected error occurred.");
                 if(availableTeachers.length > 0) setSelectedTeacherId(availableTeachers[0].idNumber);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestion();
    }, [entry, availableTeachers, fullTimeTable]);

    const suggestedTeacherInfo = useMemo(() => {
        if (!suggestion) return null;
        return allTeachers.find(t => t.idNumber === suggestion.suggestedTeacherId);
    }, [suggestion, allTeachers]);

    const handleAssign = () => {
        if (selectedTeacherId) {
            onSelectSubstitute(entry, selectedTeacherId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4 animate-scale-in" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-2">Substitute Assignment</h2>
                <p className="text-gray-400 mb-6">For class: <span className="font-semibold text-indigo-300">{entry.subject}</span> at {entry.startTime}</p>

                <div className="min-h-[12rem] flex flex-col justify-center bg-gray-900/50 rounded-lg p-6">
                    {isLoading && (
                        <div className="text-center">
                            <LoadingSpinner />
                            <p className="mt-4 text-lg text-gray-300">AI is finding a suitable teacher...</p>
                        </div>
                    )}
                    {error && !isLoading && (
                         <div className="text-center text-yellow-400">
                            <p className="font-bold">Notice</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && availableTeachers.length > 0 && (
                        <div className="space-y-6 animate-fade-in">
                            {suggestion && suggestedTeacherInfo && (
                                <div className="text-center bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                                    <h3 className="text-lg text-gray-400">AI Suggested Substitute:</h3>
                                    <p className="text-3xl font-bold text-white mt-1">{suggestedTeacherInfo.name}</p>
                                    <p className="text-sm text-blue-400">{suggestedTeacherInfo.department} Department</p>
                                    <div className="mt-3 text-left">
                                        <p className="text-xs font-semibold text-gray-300 flex items-center gap-2">
                                            <SparklesIcon className="w-4 h-4 text-yellow-300" />
                                            AI Reasoning:
                                        </p>
                                        <p className="text-gray-400 text-xs italic mt-1">"{suggestion.reason}"</p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label htmlFor="manual-substitute" className="block text-sm font-medium text-gray-300">
                                    {suggestion ? 'Assign Substitute' : 'Select a Substitute'}
                                </label>
                                <select
                                    id="manual-substitute"
                                    value={selectedTeacherId}
                                    onChange={e => setSelectedTeacherId(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white"
                                >
                                    <option value="" disabled>-- Select a teacher --</option>
                                    {availableTeachers.map(teacher => (
                                        <option key={teacher.idNumber} value={teacher.idNumber}>
                                            {teacher.name} ({teacher.department})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-700">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                    <button 
                        type="button" 
                        onClick={handleAssign}
                        disabled={!selectedTeacherId || isLoading}
                        className="px-6 py-2 rounded-md font-semibold text-white bg-green-600 hover:bg-green-500 transition-colors disabled:opacity-50"
                    >
                        Assign Substitute
                    </button>
                </div>
            </div>
        </div>
    );
};
