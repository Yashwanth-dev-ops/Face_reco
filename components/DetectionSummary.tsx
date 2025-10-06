import React, { useMemo } from 'react';
import { DetectionResult, FaceResult } from '../types';
import { emotionUIConfig, handSignUIConfig } from './uiConfig';

interface SummaryItemProps {
    emoji: string;
    label: string;
    confidence: number;
    colors: {
        bg: string;
        text: string;
    };
    description?: string;
}

const UserIcon: React.FC<{className?: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);


const SummaryItem: React.FC<SummaryItemProps> = ({ emoji, label, confidence, colors, description }) => (
    <div className="p-2.5 rounded-lg bg-slate-800/60 animate-fade-in">
        <div className="flex items-center gap-3">
            <span className={`text-2xl ${colors.text}`}>{emoji}</span>
            <div className="flex-grow">
                <p className="font-semibold text-white truncate">{label}</p>
            </div>
            <span className="font-mono text-sm text-gray-300 w-12 text-right">{Math.round(confidence * 100)}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
            <div className={`${colors.bg} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${confidence * 100}%` }}></div>
        </div>
        {description && (
            <div className="pt-2 mt-2 border-t border-slate-700/50">
                <p className="text-sm text-gray-400"><span className="font-semibold text-gray-300">Meaning:</span> {description}</p>
            </div>
        )}
    </div>
);


export const DetectionSummary: React.FC<{ result: DetectionResult, studentCount: number }> = ({ result, studentCount }) => {
    const hasDetections = result.faces.length > 0 || result.hands.length > 0;

    const visibleRegisteredStudents = useMemo(() => {
        const trackedFaces = result.faces.filter(face => face.persistentId !== undefined && face.studentInfo);
        const uniqueFaceMap = new Map<number, FaceResult>();
        for (const face of trackedFaces) {
            uniqueFaceMap.set(face.persistentId!, face);
        }
        const uniqueFaces = Array.from(uniqueFaceMap.values());
        return uniqueFaces.sort((a, b) => a.persistentId! - b.persistentId!);
    }, [result.faces]);

    return (
        <div className="w-full md:w-80 lg:w-96 flex-shrink-0 p-4 space-y-4 bg-slate-800/40 rounded-2xl border border-slate-800 backdrop-blur-sm md:self-start">
             {!hasDetections && (
                 <div className="flex flex-col items-center justify-center text-center text-gray-500 py-8">
                    <svg className="w-16 h-16 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-300">Detection Results</h3>
                    <p className="text-sm mt-1">Live analysis will appear here.</p>
                    <p className="text-xs mt-4">Total linked students: {studentCount}</p>
                </div>
            )}
            {hasDetections && (
                <div className="overflow-y-auto space-y-6 pr-1 max-h-[70vh]">
                    {visibleRegisteredStudents.length > 0 && (
                         <div>
                            <h3 className="text-lg font-bold text-purple-300 mb-3">Linked Students ({visibleRegisteredStudents.length})</h3>
                            <div className="space-y-2">
                                {visibleRegisteredStudents.map((face) => {
                                    const isBlocked = !!(face.studentInfo?.blockExpiresAt && face.studentInfo.blockExpiresAt > Date.now());
                                    return (
                                        <div key={`person-${face.persistentId}`} className={`p-2.5 rounded-lg bg-slate-800/60 animate-fade-in ${isBlocked ? 'ring-2 ring-red-500' : ''}`}>
                                        <div className="flex items-center gap-3">
                                            <UserIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
                                            <div>
                                                <p className="font-bold text-white truncate">{face.studentInfo?.name}</p>
                                                <p className="text-xs text-gray-400">Roll: {face.studentInfo?.rollNumber}</p>
                                            </div>
                                            {isBlocked && <span className="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded">BLOCKED</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2 ml-1">AI Description: {face.personId}</p>
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    {result.faces.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-teal-300 mb-3">Detected Emotions</h3>
                            <div className="space-y-2">
                                {result.faces.map((face, i) => {
                                     const idLabel = face.studentInfo ? face.studentInfo.name : (face.persistentId ? `Person ${face.persistentId}` : 'Unknown');
                                     return (
                                        <SummaryItem 
                                            key={`face-summary-${face.persistentId || i}`}
                                            emoji={emotionUIConfig[face.emotion].emoji}
                                            label={`${idLabel} - ${face.emotion}`}
                                            confidence={face.confidence}
                                            colors={emotionUIConfig[face.emotion].colors}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {result.hands.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-blue-400 mb-3">Detected Hand Signs</h3>
                            <div className="space-y-2">
                                {result.hands.map((hand, i) => {
                                    const config = handSignUIConfig[hand.sign];
                                    return (
                                        <SummaryItem 
                                            key={`hand-summary-${i}`}
                                            emoji={config.emoji}
                                            label={hand.sign}
                                            confidence={hand.confidence}
                                            colors={config.colors}
                                            description={config.description}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};