import React from 'react';
import { MidTermMarks, MarkPrediction } from '../types';

interface MyMarksPanelProps {
    marks: MidTermMarks[];
    predictions?: MarkPrediction[];
}

export const MyMarksPanel: React.FC<MyMarksPanelProps> = ({ marks, predictions }) => {
    if (!marks || marks.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col items-center justify-center text-center">
                 <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Mid-Term Marks</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Your marks have not been published yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">My Mid-Term Marks</h2>
            <div className="max-h-[70vh] overflow-auto custom-scrollbar">
                <table className="w-full text-left min-w-[600px]">
                    <thead className="sticky top-0 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm z-10">
                        <tr>
                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Subject</th>
                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">Mid-I</th>
                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">Mid-II</th>
                             <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">AI Prediction (Mid-II)</th>
                            <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 text-center">Average</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                        {marks.map((mark, index) => {
                            const avg = (mark.mid1 !== null && mark.mid2 !== null)
                                ? ((mark.mid1 + mark.mid2) / 2).toFixed(2)
                                : 'N/A';
                            
                            const prediction = predictions?.find(p => p.subject === mark.subject);
                            const aiPrediction = prediction?.ai_mid2_prediction;

                            return (
                                <tr key={index} className="hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                    <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{mark.subject}</td>
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-300 font-mono">{mark.mid1 ?? 'N/A'}</td>
                                    <td className="p-3 text-center text-gray-600 dark:text-gray-300 font-mono">{mark.mid2 ?? 'N/A'}</td>
                                    <td className="p-3 text-center text-indigo-400 font-mono font-bold">{aiPrediction ?? 'N/A'}</td>
                                    <td className="p-3 text-center font-bold text-blue-500 dark:text-blue-400 font-mono">{avg}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};