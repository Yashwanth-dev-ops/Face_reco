import React, { useState } from 'react';
import { StudentInfo, SharedNote } from '../types';

interface UploadNoteModalProps {
    currentUser: StudentInfo;
    onClose: () => void;
    onUpload: (noteData: Omit<SharedNote, 'id' | 'ratings' | 'createdAt'>) => Promise<void>;
}

export const UploadNoteModal: React.FC<UploadNoteModalProps> = ({ currentUser, onClose, onUpload }) => {
    const [title, setTitle] = useState('');
    const [subject, setSubject] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // For this simulation, we only allow plain text files for the AI summary feature to work.
            if (selectedFile.type !== 'text/plain') {
                setError('For this demo, only .txt files are allowed for summarization.');
                setFile(null);
                e.target.value = ''; // Reset file input
                return;
            }
            setError('');
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !subject.trim() || !file) {
            setError('All fields are required.');
            return;
        }

        setIsLoading(true);
        setError('');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const fileDataUrl = event.target?.result as string;
                await onUpload({
                    title,
                    subject,
                    fileDataUrl,
                    uploaderId: currentUser.rollNumber,
                });
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to upload note.');
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
             setError("Error reading the file.");
             setIsLoading(false);
        }
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">Upload a New Note</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Note Title (e.g., Lecture 3 - Big O Notation)" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                    <input type="text" placeholder="Subject (e.g., Algorithms)" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Note File (.txt only)</label>
                        <input type="file" onChange={handleFileChange} accept=".txt,text/plain" className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500" required />
                    </div>

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50">
                            {isLoading ? 'Uploading...' : 'Upload Note'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
