import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo } from '../types';

interface MarkPredictionPanelProps {
    currentUser: StudentInfo;
    onPlacePrediction: (subject: string, midTerm: 'mid1' | 'mid2', predictedMarks: number) => Promise<void>;
    onClaimReward: (subject: string, midTerm: 'mid1' | 'mid2') => Promise<void>;
}

const PREDICTION_RANGE = 5; // +/- 5 marks for a win

export const MarkPredictionPanel: React.FC<MarkPredictionPanelProps> = ({ currentUser, onPlacePrediction, onClaimReward }) => {
    const subjects = useMemo(() => {
        return currentUser.marks?.map(m => m.subject) ?? [];
    }, [currentUser.marks]);

    const [selectedSubject, setSelectedSubject] = useState<string>(subjects[0] || '');
    const [selectedMidTerm, setSelectedMidTerm] = useState<'mid1' | 'mid2'>('mid1');
    const [predictedMarks, setPredictedMarks] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const currentData = useMemo(() => {
        if (!selectedSubject) return null;
        const marksData = currentUser.marks?.find(m => m.subject === selectedSubject);
        const predictionData = currentUser.predictions?.find(p => p.subject === selectedSubject);
        return { marksData, predictionData };
    }, [selectedSubject, currentUser.marks, currentUser.predictions]);

    useEffect(() => {
        // When subject or midterm changes, update the input field with existing prediction if available
        if (currentData?.predictionData) {
            // Fix: Use 'student_mid1_prediction' and 'student_mid2_prediction' to match the type definition.
            const prediction = selectedMidTerm === 'mid1'
                ? currentData.predictionData.student_mid1_prediction
                : currentData.predictionData.student_mid2_prediction;
            setPredictedMarks(prediction !== null && prediction !== undefined ? String(prediction) : '');
        } else {
            setPredictedMarks('');
        }
        setError('');
        setSuccess('');
    }, [selectedSubject, selectedMidTerm, currentData]);

    const handlePrediction = async () => {
        const marksValue = parseInt(predictedMarks, 10);
        if (isNaN(marksValue) || marksValue < 0 || marksValue > 100) {
            setError('Please enter a valid mark between 0 and 100.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');
        try {
            await onPlacePrediction(selectedSubject, selectedMidTerm, marksValue);
            setSuccess('Prediction saved!');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save prediction.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClaim = async () => {
        setIsLoading(true);
        try {
            await onClaimReward(selectedSubject, selectedMidTerm);
        } catch(err) {
             // handle error if needed
        } finally {
            setIsLoading(false);
        }
    };

    const renderStatus = () => {
        if (!currentData) return null;

        const actualMark = selectedMidTerm === 'mid1' ? currentData.marksData?.mid1 : currentData.marksData?.mid2;
        // Fix: Use 'student_mid1_prediction' and 'student_mid2_prediction' to match the type definition.
        const prediction = selectedMidTerm === 'mid1' ? currentData.predictionData?.student_mid1_prediction : currentData.predictionData?.student_mid2_prediction;
        const rewardClaimed = selectedMidTerm === 'mid1' ? currentData.predictionData?.mid1_reward_claimed : currentData.predictionData?.mid2_reward_claimed;

        if (actualMark === null || actualMark === undefined) {
            // Marks not entered yet, show prediction form
            return (
                <div className="flex items-end gap-2">
                    <input
                        type="number"
                        min="0"
                        max="100"
                        value={predictedMarks}
                        onChange={e => setPredictedMarks(e.target.value)}
                        placeholder="0-100"
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white transition"
                    />
                    <button onClick={handlePrediction} disabled={isLoading} className="px-4 py-2 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-md disabled:opacity-50 h-full">
                        {isLoading ? '...' : 'Place'}
                    </button>
                </div>
            );
        }

        // Marks are entered, show result
        if (prediction === null || prediction === undefined) {
            return <p className="text-center text-gray-500 italic">No prediction was placed for this exam.</p>;
        }

        const isWin = Math.abs(actualMark - prediction) <= PREDICTION_RANGE;

        return (
            <div className="text-center space-y-3">
                <div className="flex justify-around">
                    <div>
                        <p className="text-sm text-gray-400">Your Prediction</p>
                        <p className="text-2xl font-bold text-blue-400">{prediction}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">Actual Marks</p>
                        <p className="text-2xl font-bold text-white">{actualMark}</p>
                    </div>
                </div>
                {isWin ? (
                    <div className="p-3 bg-green-900/50 rounded-lg">
                        <p className="font-bold text-green-300">🎉 You Won! 🎉</p>
                        <p className="text-xs text-green-400">Your prediction was within {PREDICTION_RANGE} marks.</p>
                        {!rewardClaimed && (
                            <button onClick={handleClaim} disabled={isLoading} className="mt-2 text-xs font-bold bg-yellow-500 text-black px-3 py-1 rounded-full hover:bg-yellow-400">
                                {isLoading ? '...' : 'Claim Reward'}
                            </button>
                        )}
                        {rewardClaimed && <p className="text-xs mt-2 text-yellow-300">Reward Claimed!</p>}
                    </div>
                ) : (
                     <div className="p-3 bg-red-900/50 rounded-lg">
                        <p className="font-bold text-red-300">Better Luck Next Time!</p>
                        <p className="text-xs text-red-400">Your prediction was off by {Math.abs(actualMark - prediction)} marks.</p>
                    </div>
                )}
            </div>
        );
    };

    if (subjects.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col items-center justify-center text-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Marks Prediction Challenge</h3>
                <p className="text-gray-500 mt-2">Your subjects list is not available yet.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 sm:p-6 rounded-xl border border-gray-200 dark:border-gray-700 h-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Marks Prediction Challenge</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                        {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                     <select value={selectedMidTerm} onChange={e => setSelectedMidTerm(e.target.value as 'mid1' | 'mid2')} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                        <option value="mid1">Mid-I</option>
                        <option value="mid2">Mid-II</option>
                    </select>
                </div>
                <div>{renderStatus()}</div>
                 <div className="text-center text-sm h-5">
                    {error && <p className="text-red-400">{error}</p>}
                    {success && <p className="text-green-400">{success}</p>}
                </div>
            </div>
        </div>
    );
};