





import React, { useState, useMemo } from 'react';
import { StudentInfo, SharedNote } from '../types';
import { UploadNoteModal } from './UploadNoteModal';
import { SparklesIcon } from './SparklesIcon';

interface NotesExchangePanelProps {
    currentUser: StudentInfo;
    sharedNotes: SharedNote[];
    onUploadNote: (noteData: Omit<SharedNote, 'id' | 'ratings' | 'createdAt'>) => Promise<void>;
    onRateNote: (noteId: string, rating: number) => Promise<void>;
    onSummarizeNote: (noteId: string) => Promise<string>;
}

const StarIcon: React.FC<{ filled: boolean, className?: string, onClick?: () => void }> = ({ filled, className, onClick }) => (
    <svg onClick={onClick} xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 cursor-pointer ${className} ${filled ? 'text-yellow-400' : 'text-gray-500'}`} viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
);

const NoteCard: React.FC<{ 
    note: SharedNote, 
    currentUser: StudentInfo, 
    onRateNote: (noteId: string, rating: number) => Promise<void>,
    onSummarizeNote: (noteId: string) => Promise<string> 
}> = ({ note, currentUser, onRateNote, onSummarizeNote }) => {
    const [ratingLoading, setRatingLoading] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');

    const avgRating = useMemo(() => {
        if (note.ratings.length === 0) return 0;
        const sum = note.ratings.reduce((acc, r) => acc + r.rating, 0);
        return sum / note.ratings.length;
    }, [note.ratings]);
    
    const currentUserRating = useMemo(() => {
        return note.ratings.find(r => r.raterId === currentUser.rollNumber)?.rating || 0;
    }, [note.ratings, currentUser.rollNumber]);

    const handleRate = async (rating: number) => {
        setRatingLoading(true);
        await onRateNote(note.id, rating);
        setRatingLoading(false);
    };

    const handleSummarize = async () => {
        setSummaryLoading(true);
        setSummaryError('');
        try {
            const result = await onSummarizeNote(note.id);
            setSummary(result);
        } catch (e) {
            setSummaryError(e instanceof Error ? e.message : 'Failed to summarize.');
        } finally {
            setSummaryLoading(false);
        }
    };

    const renderMarkdownSummary = (text: string) => {
        const html = text
            .replace(/\n\s*-\s*(.*)/g, '<li class="ml-4">$1</li>') // List items
            .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 text-xs">$1</ul>'); // Wrap lists
        return { __html: html };
    };

    return (
        <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
            <div>
                <p className="font-bold text-gray-900 dark:text-white truncate">{note.title}</p>
                <p className="text-sm text-blue-500 dark:text-blue-400">{note.subject}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uploaded by: {note.uploaderId}</p>
                
                {summary && (
                    <div className="mt-2 pt-2 border-t border-gray-700/50 text-gray-300">
                        {/* FIX: Corrected function call from `renderMarkdown` to `renderMarkdownSummary` to match the function defined in the component. */}
                        <div dangerouslySetInnerHTML={renderMarkdownSummary(summary)} />
                    </div>
                )}
                 {summaryError && <p className="text-xs text-red-400 mt-2">{summaryError}</p>}
            </div>
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= currentUserRating} onClick={() => !ratingLoading && handleRate(i)} />)}
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({avgRating.toFixed(1)})</span>
                </div>
                <button onClick={handleSummarize} disabled={summaryLoading} className="px-2 py-1 text-xs font-semibold text-white bg-indigo-600 rounded hover:bg-indigo-500 flex items-center gap-1 disabled:opacity-50">
                    <SparklesIcon className="w-4 h-4" />
                    {summaryLoading ? '...' : 'Summarize'}
                </button>
            </div>
        </div>
    );
};

export const NotesExchangePanel: React.FC<NotesExchangePanelProps> = (props) => {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    
    return (
        <>
            {isUploadModalOpen && (
                <UploadNoteModal 
                    currentUser={props.currentUser}
                    onClose={() => setIsUploadModalOpen(false)}
                    onUpload={props.onUploadNote}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Shared Notes</h3>
                <button onClick={() => setIsUploadModalOpen(true)} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all">
                    Upload Note
                </button>
            </div>
            {props.sharedNotes.length === 0 ? (
                 <p className="text-gray-500 text-center py-16">No notes have been shared yet. Be the first!</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {props.sharedNotes.map(note => (
                        <NoteCard key={note.id} note={note} {...props} />
                    ))}
                </div>
            )}
        </>
    );
};