import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { StudyGroup, StudentInfo, GroupTask, GroupChatMessage, GroupEvent } from '../types';
import { PaperClipIcon } from './PaperClipIcon';
import { ConfirmationModal } from './ConfirmationModal';
import { Message, WaveformPlayer } from './ChatMessage';
import { EventsPanel } from './EventsPanel';
import { EmojiPicker } from './EmojiPicker';

interface StudyGroupChatModalProps {
    group: StudyGroup;
    currentUser: StudentInfo;
    studentDirectory: Map<string, StudentInfo>;
    onClose: () => void;
    onSendGroupMessage: (groupId: string, content: string, file?: { name: string; url: string }, audio?: { url: string; duration: number }, replyToMessageId?: string) => Promise<void>;
    onDeleteGroupMessage: (groupId: string, messageId: string, deleteType: 'me' | 'everyone') => Promise<void>;
    onPinMessage: (groupId: string, messageId: string) => Promise<void>;
    onAddTask: (groupId: string, task: Omit<GroupTask, 'id' | 'completed'>) => Promise<void>;
    onToggleTask: (groupId: string, taskId: string) => Promise<void>;
    onAddMemberToGroup: (groupId: string, studentRollNumber: string) => Promise<void>;
    onDeleteGroupResource: (groupId: string, resourceId: string) => Promise<void>;
    onScheduleEvent: (groupId: string, eventData: Omit<GroupEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (groupId: string, eventId: string) => Promise<void>;
}

// --- Icon Components ---
const LoadingSpinner: React.FC = () => (
    <div className="w-5 h-5 border-2 border-t-2 border-gray-200 border-t-transparent rounded-full animate-spin"></div>
);

const PinIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M11.536 2.129a.75.75 0 011.06 0l5.25 5.25a.75.75 0 010 1.061l-5.25 5.25a.75.75 0 01-1.06-1.061l3.72-3.72H6.75a.75.75 0 010-1.5h8.505l-3.72-3.72a.75.75 0 010-1.06z" clipRule="evenodd" transform="rotate(45 10 10)" />
        <path fillRule="evenodd" d="M3.75 6.75a1 1 0 011-1h10.5a1 1 0 011 1v6.5a1 1 0 01-1 1H4.75a1 1 0 01-1-1v-6.5z" clipRule="evenodd" />
    </svg>
);

const MicIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
        <path d="M6 10.5a.75.75 0 01.75.75v1.5a4.5 4.5 0 109 0v-1.5a.75.75 0 011.5 0v1.5a6 6 0 11-12 0v-1.5a.75.75 0 01.75-.75z" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

export const StudyGroupChatModal: React.FC<StudyGroupChatModalProps> = (props) => {
    const { group, currentUser, onClose, onSendGroupMessage, onDeleteGroupMessage, onPinMessage, onAddTask, onToggleTask, onAddMemberToGroup, studentDirectory, onDeleteGroupResource, onScheduleEvent, onDeleteEvent } = props;
    const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'events' | 'members'>('chat');
    const [message, setMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    
    // Voice Message State
    const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded'>('idle');
    const [recordedAudio, setRecordedAudio] = useState<{ url: string; blob: Blob } | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<number | null>(null);

    const [inviteSearch, setInviteSearch] = useState('');
    
    // New state for message actions
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<GroupChatMessage | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const isAtBottomRef = useRef(true);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useLayoutEffect(() => {
        const chatContainer = chatContainerRef.current;
        if (activeTab === 'chat' && chatContainer) {
            if (isAtBottomRef.current) {
                // Instantly jump to the bottom if user was already there
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    }, [group.messages, activeTab]);
    
    useEffect(() => {
        const chatContainer = chatContainerRef.current;
        const handleScroll = () => {
            if (chatContainer) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainer;
                // Add a small threshold to consider it "at the bottom"
                isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
            }
        };

        if (chatContainer) {
            chatContainer.addEventListener('scroll', handleScroll);
        }
        return () => {
            if (chatContainer) {
                chatContainer.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node) &&
                emojiButtonRef.current && !emojiButtonRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (recordingState === 'recording') {
            setRecordingTime(0);
            recordingTimerRef.current = window.setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } else {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
                recordingTimerRef.current = null;
            }
        }
        return () => {
            if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        };
    }, [recordingState]);
    
    const isGroupAdmin = group.roles[currentUser.rollNumber] === 'admin';

    const inviteSearchResults = useMemo(() => {
        if (!inviteSearch.trim()) return [];
        const searchLower = inviteSearch.toLowerCase();
        return Array.from(studentDirectory.values()).filter((student: StudentInfo) =>
            !group.members.includes(student.rollNumber) &&
            (student.name.toLowerCase().includes(searchLower) || student.rollNumber.toLowerCase().includes(searchLower))
        );
    }, [inviteSearch, studentDirectory, group.members]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleSend = async () => {
        if ((!message.trim() && !file) || isLoading) return;
        setIsLoading(true);
        isAtBottomRef.current = true; // Force scroll to bottom after sending a new message
        try {
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const url = e.target?.result as string;
                    await onSendGroupMessage(group.id, message, { name: file.name, url }, undefined, replyingTo?.id);
                    setMessage(''); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setIsLoading(false); setReplyingTo(null);
                };
                reader.readAsDataURL(file);
            } else {
                await onSendGroupMessage(group.id, message, undefined, undefined, replyingTo?.id);
                setMessage(''); setIsLoading(false); setReplyingTo(null);
            }
        } catch (error) { console.error("Failed to send message:", error); setIsLoading(false); }
    };

    const handleStartRecording = async () => {
        if (recordingState !== 'idle') return;
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };
                mediaRecorderRef.current.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    setRecordedAudio({ url: audioUrl, blob: audioBlob });
                    setRecordingState('recorded');
                    audioChunksRef.current = [];
                    stream.getTracks().forEach(track => track.stop());
                };
                mediaRecorderRef.current.start();
                setRecordingState('recording');
            } catch (err) {
                console.error("Error accessing microphone:", err);
            }
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleCancelRecording = () => {
        if (mediaRecorderRef.current && recordingState === 'recording') {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            mediaRecorderRef.current = null;
        }
        audioChunksRef.current = [];
        setRecordingState('idle');
        setRecordedAudio(null);
    };

    const handleSendAudio = async () => {
        if (!recordedAudio) return;
        setIsLoading(true);
        isAtBottomRef.current = true; // Force scroll on send
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const url = e.target?.result as string;
                await onSendGroupMessage(group.id, '', undefined, { url, duration: recordingTime }, replyingTo?.id);
                handleCancelRecording(); // Reset all state
                setIsLoading(false);
                setReplyingTo(null);
            };
            reader.readAsDataURL(recordedAudio.blob);
        } catch (error) {
            console.error("Failed to send audio:", error);
            setIsLoading(false);
        }
    };
    
    const handleAddTask = async () => {
        if (!newTaskText.trim()) return;
        await onAddTask(group.id, { text: newTaskText });
        setNewTaskText('');
    };
    
    const pinnedMessages = group.pinnedMessageIds
        .map(id => group.messages.find(msg => msg.id === id))
        .filter((msg): msg is GroupChatMessage => !!msg);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
                <div
                    className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-4xl m-4 h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                    style={{ viewTransitionName: `group-${group.id}` }}
                >
                    <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center">
                             <span className="text-2xl mr-3">{group.icon}</span>
                            <div>
                                <h2 className="text-xl font-bold text-white">{group.name}</h2>
                                <p className="text-sm text-blue-400">{group.subject}</p>
                            </div>
                        </div>
                         <div className="flex space-x-1 bg-gray-900/50 p-1 rounded-lg">
                            <button onClick={() => setActiveTab('chat')} className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Chat</button>
                            <button onClick={() => setActiveTab('tasks')} className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Tasks</button>
                            <button onClick={() => setActiveTab('events')} className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === 'events' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Events</button>
                            <button onClick={() => setActiveTab('members')} className={`px-3 py-1 text-xs font-semibold rounded ${activeTab === 'members' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Members</button>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </header>

                    <main className="flex-grow overflow-y-auto min-h-0 no-scrollbar relative">
                        {activeTab === 'chat' && (
                            <div className="h-full flex flex-col">
                                {pinnedMessages.length > 0 && (
                                    <div className="p-2 bg-gray-900/50 border-b border-gray-700 flex-shrink-0">
                                        {pinnedMessages.map(msg => (
                                            <div key={`pin-${msg.id}`} className="p-2 rounded-md bg-yellow-900/30 text-xs flex items-start gap-2">
                                                <PinIcon className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="font-bold">{msg.senderId}</p>
                                                    <p className="text-yellow-200">{msg.content || (msg.file && `File: ${msg.file.name}`) || 'Poll'}</p>
                                                </div>
                                                {isGroupAdmin && <button onClick={() => onPinMessage(group.id, msg.id)} className="ml-auto text-yellow-500 text-lg">&times;</button>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 custom-scrollbar">
                                    {group.messages.map(msg => <Message key={msg.id} msg={msg} allMessages={group.messages} isOwn={msg.senderId === currentUser.rollNumber} isPinned={group.pinnedMessageIds.includes(msg.id)} canPin={isGroupAdmin} onPin={(msgId) => onPinMessage(group.id, msgId)} currentUserRoll={currentUser.rollNumber} onDelete={(msgId, deleteType) => onDeleteGroupMessage(group.id, msgId, deleteType)} isGroupAdmin={isGroupAdmin} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} onReply={setReplyingTo} menuRef={menuRef} />)}
                                </div>
                            </div>
                        )}
                        {activeTab === 'tasks' && (
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2">
                                    <input type="text" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} placeholder="Add a new task..." className="w-full bg-gray-700 border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                                    <button onClick={handleAddTask} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg">Add</button>
                                </div>
                                <ul className="space-y-2">
                                    {group.tasks.map(task => (
                                        <li key={task.id} className="p-2 flex items-center bg-gray-700/50 rounded-md">
                                            <input type="checkbox" checked={task.completed} onChange={() => onToggleTask(group.id, task.id)} className="w-5 h-5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-600" />
                                            <span className={`ml-3 text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>{task.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {activeTab === 'events' && (
                            <EventsPanel
                                group={group}
                                currentUser={currentUser}
                                onScheduleEvent={onScheduleEvent}
                                onDeleteEvent={onDeleteEvent}
                            />
                        )}
                        {activeTab === 'members' && (
                            <div className="p-4">
                                {isGroupAdmin && (
                                    <div className="mb-4 p-4 border border-gray-700 rounded-lg">
                                        <h4 className="font-semibold text-white mb-2">Invite Members</h4>
                                        <input type="text" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} placeholder="Search student by name or roll..." className="w-full bg-gray-700 border-gray-600 rounded-lg px-3 py-2 text-sm text-white" />
                                        <div className="max-h-32 overflow-y-auto mt-2 space-y-1">
                                            {inviteSearchResults.map(student => (
                                                <div key={student.rollNumber} className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
                                                    <p>{student.name} ({student.rollNumber})</p>
                                                    <button onClick={() => onAddMemberToGroup(group.id, student.rollNumber)} className="text-xs px-2 py-1 bg-blue-600 rounded">Add</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <ul className="divide-y divide-gray-700">
                                    {group.members.map(memberId => {
                                        const isadmin = group.roles[memberId] === 'admin';
                                        return (
                                        <li key={memberId} className="py-2 flex justify-between items-center">
                                            <p className={`font-semibold ${isadmin ? 'text-red-400' : 'text-green-400'}`}>{studentDirectory.get(memberId)?.name || memberId}</p>
                                            <p className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-600 text-gray-300">{group.roles[memberId] || 'member'}</p>
                                        </li>
                                    )})}
                                </ul>
                            </div>
                        )}
                    </main>
                    
                    {activeTab === 'chat' && (
                        <footer className="relative flex-shrink-0 p-4 border-t border-gray-700 bg-slate-800">
                             {replyingTo && (
                                <div className="bg-gray-700/50 p-2 border-b-2 border-blue-500 flex justify-between items-center text-sm mb-2 rounded-t-md">
                                    <div>
                                        <p className="text-gray-400">Replying to <span className="font-bold text-blue-300">{replyingTo.senderId}</span></p>
                                        <p className="text-gray-200 italic truncate">{replyingTo.content || 'Attachment'}</p>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-600 text-xl">&times;</button>
                                </div>
                            )}
                            {showEmojiPicker && <EmojiPicker ref={emojiPickerRef} onEmojiSelect={(emoji) => { setMessage(prev => prev + emoji); }} />}
                            {recordingState === 'idle' && (
                                <>
                                    <div className="flex items-end gap-2">
                                        <div className="flex items-center py-1 pl-4 pr-1 bg-gray-700 rounded-full w-full">
                                            <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(p => !p)} title="Emoji" className="p-2 rounded-full text-gray-300 hover:bg-gray-600">🙂</button>
                                            <input type="text" value={message} onChange={e => setMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && !isLoading && handleSend()} placeholder="Type a message..." className="flex-grow bg-transparent text-white focus:outline-none" />
                                            <input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                            <label htmlFor="file-upload" className="p-2 rounded-full text-gray-300 hover:bg-gray-600 cursor-pointer">
                                                <PaperClipIcon className="w-5 h-5" />
                                            </label>
                                        </div>
                                        <button disabled={isLoading} onClick={(message.trim() || file) ? handleSend : handleStartRecording} className="w-12 h-12 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:bg-blue-500 disabled:bg-gray-600">
                                            {isLoading ? <LoadingSpinner /> : ((message.trim() || file) ? <SendIcon className="w-6 h-6 -rotate-45" /> : <MicIcon className="w-6 h-6" />)}
                                        </button>
                                    </div>
                                    {file && <div className="mt-2 text-sm flex items-center justify-between bg-gray-700/50 p-2 rounded-md"> <span className="truncate text-gray-300">{file.name}</span> <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1 text-xl rounded-full text-gray-400 hover:bg-gray-600">&times;</button> </div>}
                                </>
                            )}
                            {recordingState === 'recording' && (
                                <div className="flex items-center justify-between h-12 px-4 w-full bg-gray-700 rounded-full">
                                    <button onClick={handleCancelRecording} className="p-2 text-red-400 hover:bg-red-900/50 rounded-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <div className="flex items-center">
                                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse mr-3"></div>
                                        <div className="text-gray-300 text-sm font-mono">{formatTime(recordingTime)}</div>
                                    </div>
                                    <button onClick={handleStopRecording} className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-full text-white hover:bg-blue-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" /></svg>
                                    </button>
                                </div>
                            )}
                             {recordingState === 'recorded' && recordedAudio && (
                                <div className="flex items-center justify-between h-12 px-2 w-full bg-gray-700 rounded-full">
                                    <button onClick={handleCancelRecording} className="p-2 text-red-400 hover:bg-red-900/50 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                    <div className="flex-grow px-2">
                                        <WaveformPlayer src={recordedAudio.url} duration={recordingTime} />
                                    </div>
                                    <button onClick={handleSendAudio} disabled={isLoading} className="w-12 h-12 flex-shrink-0 bg-blue-600 rounded-full flex items-center justify-center text-white transition-colors hover:bg-blue-500 disabled:bg-gray-600">
                                        {isLoading ? <LoadingSpinner/> : <SendIcon className="w-6 h-6 -rotate-45"/>}
                                    </button>
                                </div>
                            )}
                        </footer>
                    )}
                </div>
            </div>
        </>
    );
}