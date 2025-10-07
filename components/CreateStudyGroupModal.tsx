import React, { useState, useMemo } from 'react';
import { StudentInfo, StudyGroup, Year, Gender } from '../types';
import { ToggleSwitch } from './ToggleSwitch';

interface CreateStudyGroupModalProps {
    currentUser: StudentInfo;
    studentDirectory: Map<string, StudentInfo>;
    onClose: () => void;
    onCreate: (groupData: Omit<StudyGroup, 'id' | 'events' | 'messages'>) => Promise<void>;
}

const emojiCategories = {
    'Academic': ['📚', '🎓', '🔬', '🧪', '⚗️', '📈', '📊', '📝', '📌', '💡'],
    'Tech & Code': ['💻', '💾', '🖱️', '👨‍💻', '👩‍💻', '⚙️', '🔗', '🤖', '🌐', '📡'],
    'Creative': ['🎨', '✏️', '✒️', '🖌️', '🎵', '🎤', '🎬', '🎭', '🏛️', '📸'],
    'Collaboration': ['🤝', '🙌', '💪', '🎯', '🚀', '🧠', '🗣️', '💬', '✨', '🏆'],
    'Fun & Misc': ['😎', '🤓', '🎉', '🔥', '🎲', '🍕', '🍿', '🌍', '⚡️', '💯']
};

export const CreateStudyGroupModal: React.FC<CreateStudyGroupModalProps> = ({ currentUser, studentDirectory, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('📚');
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [maxSize, setMaxSize] = useState(10);
    const [isPrivate, setIsPrivate] = useState(false);
    const [genderRestriction, setGenderRestriction] = useState<'None' | Gender.Male | Gender.Female>('None');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    // State for private group invitations
    const [inviteSearch, setInviteSearch] = useState('');
    const [invitedMembers, setInvitedMembers] = useState<string[]>([]);

    const classmatesForInvite = useMemo(() => {
        return Array.from(studentDirectory.values()).filter((student: StudentInfo) =>
            student.rollNumber !== currentUser.rollNumber && // Exclude self
            !invitedMembers.includes(student.rollNumber) && // Exclude already invited
            student.department === currentUser.department &&
            student.year === currentUser.year &&
            student.section === currentUser.section
        );
    }, [studentDirectory, invitedMembers, currentUser]);

    const inviteSearchResults = useMemo(() => {
        if (!inviteSearch.trim()) return classmatesForInvite;
        const searchLower = inviteSearch.toLowerCase();
        return classmatesForInvite.filter(student =>
            student.name.toLowerCase().includes(searchLower) || student.rollNumber.toLowerCase().includes(searchLower)
        );
    }, [inviteSearch, classmatesForInvite]);


    const handleInvite = (rollNumber: string) => {
        setInvitedMembers(prev => [...prev, rollNumber]);
        setInviteSearch('');
    };
    
    const handleRemoveInvite = (rollNumber: string) => {
        setInvitedMembers(prev => prev.filter(id => id !== rollNumber));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !subject.trim()) {
            setError('Group name and subject are required.');
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await onCreate({
                name,
                icon,
                subject,
                description,
                maxSize,
                department: currentUser.department,
                year: currentUser.year,
                section: currentUser.section,
                createdBy: currentUser.rollNumber,
                members: [currentUser.rollNumber],
                isPrivate,
                pendingMembers: isPrivate ? invitedMembers : [],
                genderRestriction: genderRestriction === 'None' ? undefined : genderRestriction,
                pinnedMessageIds: [],
                roles: { [currentUser.rollNumber]: 'admin' },
                tasks: [],
                resources: [],
            });
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create group.');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700 w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-white mb-6">Create a New Study Group</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Group Icon & Name</label>
                        <div className="flex items-center gap-2">
                            <input type="text" value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} className="w-16 text-center text-2xl bg-gray-900 border border-gray-700 rounded-lg px-3 py-1 text-white" />
                            <input type="text" placeholder="Group Name (e.g., Algo Champions)" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                        </div>
                        <div className="mt-3 space-y-2">
                            {Object.entries(emojiCategories).map(([category, emojis]) => (
                                <div key={category}>
                                    <p className="text-xs font-semibold text-gray-400 mb-1">{category}</p>
                                    <div className="flex flex-wrap gap-1">
                                        {emojis.map(emoji => (
                                            <button type="button" key={emoji} onClick={() => setIcon(emoji)} className={`w-9 h-9 flex items-center justify-center rounded-lg text-xl transition-all ${icon === emoji ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <input type="text" placeholder="Subject (e.g., Data Structures)" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief description of the group's goals..." rows={2} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Max Group Size: {maxSize}</label>
                        <input type="range" min="2" max="20" value={maxSize} onChange={e => setMaxSize(parseInt(e.target.value, 10))} className="w-full" />
                    </div>
                    <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Private Group</label>
                            <p className="text-xs text-gray-400">Private groups are invite-only and hidden from search.</p>
                        </div>
                        <ToggleSwitch checked={isPrivate} onChange={setIsPrivate} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Group Gender Policy</label>
                        <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg">
                            <button type="button" onClick={() => setGenderRestriction('None')} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${genderRestriction === 'None' ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Mixed Gender</button>
                            <button type="button" onClick={() => setGenderRestriction(Gender.Male)} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${genderRestriction === Gender.Male ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Boys Only</button>
                            <button type="button" onClick={() => setGenderRestriction(Gender.Female)} className={`flex-1 py-2 font-semibold transition-colors rounded-md text-sm ${genderRestriction === Gender.Female ? 'text-white bg-blue-600 shadow' : 'text-gray-400 hover:text-white'}`}>Girls Only</button>
                        </div>
                    </div>

                    {isPrivate && (
                        <div className="p-4 border border-gray-700 rounded-lg bg-gray-900/30 animate-fade-in">
                            <h4 className="font-semibold text-white mb-2">Invite Your Classmates</h4>
                            <input type="text" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} placeholder="Search classmates by name or roll..." className="w-full bg-gray-700 border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                            <div className="max-h-32 overflow-y-auto mt-2 space-y-1 custom-scrollbar">
                                {inviteSearchResults.length > 0 ? inviteSearchResults.map(student => (
                                    <div key={student.rollNumber} className="flex justify-between items-center p-2 bg-gray-900/50 rounded text-sm">
                                        <p>{student.name} ({student.department} - Sec-{student.section})</p>
                                        <button type="button" onClick={() => handleInvite(student.rollNumber)} className="text-xs px-2 py-0.5 bg-blue-600 rounded">Invite</button>
                                    </div>
                                )) : <p className="text-xs text-center text-gray-500 py-2">{inviteSearch ? 'No matching classmates found.' : 'Your classmates will appear here.'}</p>}
                            </div>
                            {invitedMembers.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-xs text-gray-400">Invited:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {invitedMembers.map(roll => (
                                            <div key={roll} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded-full text-xs">
                                                <span>{studentDirectory.get(roll)?.name || roll}</span>
                                                <button type="button" onClick={() => handleRemoveInvite(roll)} className="text-red-400">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50">
                            {isLoading ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};