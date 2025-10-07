import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Conversation, ChatMessage, AdminInfo, StudentInfo, Designation, TimeTableEntry, KnowledgeDocument } from '../types';
import { ToggleSwitch } from './ToggleSwitch';
import { PadlockIcon } from './PadlockIcon';
import { ExclamationIcon } from './ExclamationIcon';
import { MessageBubble } from './MessageBubble';
import { PaperClipIcon } from './PaperClipIcon';
import { ContextPanel } from './ContextPanel';
import { SparklesIcon } from './SparklesIcon';
import { SourceViewerModal } from './SourceViewerModal';
import { ChatPlaceholder } from './ChatPlaceholder';
import { EmojiPicker } from './EmojiPicker';
import { Avatar } from './Avatar';


type CurrentUser = (AdminInfo & { userType: 'ADMIN' }) | (StudentInfo & { userType: 'STUDENT' });

interface CommunicationPanelProps {
    currentUser: CurrentUser;
    conversations: Conversation[];
    onSendMessage: (receiverId: string, content: string, file?: { name: string; url: string }, isPriority?: boolean, replyToMessageId?: string) => Promise<void>;
    studentDirectory: Map<string, StudentInfo>;
    adminDirectory: Map<string, AdminInfo>;
    timeTable?: TimeTableEntry[];
    onQueryKnowledgeBase?: (query: string) => Promise<{ answer: string; sources: KnowledgeDocument[] }>;
}

// Group types for memoization
type DateSeparatorGroup = { id: string; type: 'date'; date: string };
type MessageGroup = { id: string; type: 'messages'; senderId: string; messages: ChatMessage[] };

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const FaceSmileIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


const TypingIndicator: React.FC = () => (
    <div className="flex items-center space-x-1.5">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
    </div>
);


const DateSeparator: React.FC<{ date: Date }> = ({ date }) => (
    <div className="text-center text-xs text-gray-500 my-4">
        <span className="bg-gray-700/60 px-3 py-1 rounded-full text-gray-300">
            {date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
    </div>
);

type AIResponse = {
    state: 'loading' | 'success' | 'error';
    answer?: string;
    sources?: KnowledgeDocument[];
    error?: string;
};

const AIResponseBubble: React.FC<{ response: AIResponse, setViewingSource: (doc: KnowledgeDocument) => void }> = ({ response, setViewingSource }) => {
    const renderMarkdown = (text: string) => {
        const html = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\s*-\s*(.*)/g, '<li class="ml-2">$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc list-inside space-y-1 my-1">$1</ul>');
        return { __html: html };
    };

    return (
        <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/50 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-5 h-5 text-indigo-200" />
            </div>
            <div className="bg-gray-700 p-3 rounded-lg max-w-xl">
                {response.state === 'loading' && <TypingIndicator />}
                {response.state === 'error' && <p className="text-sm text-red-400">{response.error}</p>}
                {response.state === 'success' && (
                    <>
                        <div className="text-sm text-gray-300" dangerouslySetInnerHTML={renderMarkdown(response.answer!)} />
                        {response.sources && response.sources.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-600">
                                <h4 className="text-xs font-bold text-gray-400 mb-2">SOURCES:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {response.sources.map(source => (
                                        <button key={source.id} onClick={() => setViewingSource(source)} className="text-xs bg-gray-600/70 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-md transition-colors">
                                            {source.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};


export const CommunicationPanel: React.FC<CommunicationPanelProps> = ({
    currentUser,
    conversations,
    onSendMessage,
    studentDirectory,
    adminDirectory,
    timeTable,
    onQueryKnowledgeBase
}) => {
    const [localConversations, setLocalConversations] = useState(conversations);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isNewChatView, setIsNewChatView] = useState(false);
    const [isPriority, setIsPriority] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [aiChat, setAiChat] = useState<{ query: string; response: AIResponse } | null>(null);
    const [viewingSource, setViewingSource] = useState<KnowledgeDocument | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);


    const typingTimeoutRef = useRef<number | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);

    const currentUserId = currentUser.userType === 'ADMIN' ? currentUser.idNumber : currentUser.rollNumber;
    
    useEffect(() => {
        setLocalConversations(conversations);
    }, [conversations]);

     const getParticipantInfo = (participantId: string): (StudentInfo & { type: 'Student'}) | (AdminInfo & { type: 'Admin' }) | null => {
        const admin = adminDirectory.get(participantId);
        if(admin) return { ...admin, type: 'Admin' };
        const student = studentDirectory.get(participantId);
        if(student) return { ...student, type: 'Student' };
        return null;
    };

    const sortedConversations = useMemo(() => {
        const filtered = localConversations.filter(convo => {
            if (searchQuery.trim() === '') return true;
            const otherId = convo.participantIds.find(id => id !== currentUserId);
            const participant = otherId ? getParticipantInfo(otherId) : null;
            return participant?.name.toLowerCase().includes(searchQuery.toLowerCase());
        });
        return filtered.sort((a, b) => b.lastUpdate - a.lastUpdate);
    }, [localConversations, searchQuery, currentUserId]);


    const selectedConversation = useMemo(() =>
        sortedConversations.find(c => c.id === selectedConversationId),
    [sortedConversations, selectedConversationId]);
    
    const groupContent = useMemo((): (DateSeparatorGroup | MessageGroup)[] => {
        if (!selectedConversation) return [];
    
        const groups: (DateSeparatorGroup | MessageGroup)[] = [];
        let lastDate: string | null = null;
    
        selectedConversation.messages.forEach((message, index) => {
            const messageDate = new Date(message.timestamp).toDateString();
            
            if (messageDate !== lastDate) {
                groups.push({ type: 'date', date: messageDate, id: messageDate });
                lastDate = messageDate;
            }
    
            const prevMessage = selectedConversation.messages[index - 1];
            
            if (prevMessage && prevMessage.senderId === message.senderId && lastDate === new Date(prevMessage.timestamp).toDateString()) {
                const lastGroup = groups[groups.length - 1];
                if (lastGroup.type === 'messages') {
                    lastGroup.messages.push(message);
                }
            } else {
                groups.push({
                    type: 'messages',
                    id: message.id,
                    senderId: message.senderId,
                    messages: [message]
                });
            }
        });
        return groups;
    }, [selectedConversation]);

    useEffect(() => {
        if (!isNewChatView && sortedConversations.length > 0 && !selectedConversationId) {
            setSelectedConversationId(sortedConversations[0].id);
        }
        setAiChat(null);
    }, [sortedConversations, selectedConversationId, isNewChatView]);
    
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [selectedConversationId, groupContent, aiChat]);

    useEffect(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        const lastMessage = selectedConversation?.messages[selectedConversation.messages.length - 1];
        if (lastMessage && lastMessage.senderId === currentUserId && selectedConversationId === selectedConversation?.id) {
            typingTimeoutRef.current = window.setTimeout(() => {
                setIsTyping(true);
                typingTimeoutRef.current = window.setTimeout(() => {
                    setIsTyping(false);
                }, Math.random() * 2000 + 1500);
            }, 1000);
        }

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            setIsTyping(false);
        };
    }, [selectedConversation?.messages, currentUserId, selectedConversationId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
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


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };


    const handleSendMessageWrapper = async () => {
        const conversationId = selectedConversationId;
        if ((!newMessage.trim() && !file) || !conversationId) return;

        if (newMessage.trim().toLowerCase().startsWith('/ai ') && onQueryKnowledgeBase) {
            const query = newMessage.trim().substring(4);
            if(!query) return;

            setNewMessage('');
            setAiChat({ query, response: { state: 'loading' } });
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

            try {
                const { answer, sources } = await onQueryKnowledgeBase(query);
                setAiChat(prev => prev ? { ...prev, response: { state: 'success', answer, sources } } : null);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'An unknown error occurred.';
                setAiChat(prev => prev ? { ...prev, response: { state: 'error', error: errorMsg } } : null);
            }
            return;
        }

        const convo = localConversations.find(c => c.id === conversationId);
        const receiverId = convo?.participantIds.find(id => id !== currentUserId);
        
        if (!receiverId) return;
        
        setIsLoading(true);
        try {
            if (file) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const fileDataUrl = e.target?.result as string;
                    await onSendMessage(receiverId!, newMessage.trim(), { name: file.name, url: fileDataUrl }, isPriority, replyingTo?.id);
                    setNewMessage('');
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    setIsPriority(false);
                };
                reader.readAsDataURL(file);
            } else {
                await onSendMessage(receiverId, newMessage.trim(), undefined, isPriority, replyingTo?.id);
                setNewMessage('');
                setIsPriority(false);
            }
             setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        } catch (error) {
            console.error("Failed to send message:", error);
        } finally {
            setIsLoading(false);
            setReplyingTo(null);
        }
    };
    
    const handleSelectConversation = (id: string | null) => {
        setSelectedConversationId(id);
        setIsNewChatView(false);
        setIsContextPanelOpen(false);
    };
    
    const handleNewChat = (contactId: string) => {
        const conversationId = [currentUserId, contactId].sort().join('_');
        const existingConvo = localConversations.find(c => c.id === conversationId);
        
        if(existingConvo) {
            setSelectedConversationId(existingConvo.id);
        } else {
            const tempConvo: Conversation = {
                id: conversationId,
                participantIds: [currentUserId, contactId].sort() as [string, string],
                messages: [],
                lastUpdate: Date.now(),
            };
            setLocalConversations(prev => [tempConvo, ...prev]);
            setSelectedConversationId(tempConvo.id);
        }
        setIsNewChatView(false);
        setIsContextPanelOpen(false);
    };


    const availableContacts = useMemo(() => {
        if (currentUser.userType === 'ADMIN') {
            const { designation, department, idNumber } = currentUser;
            const isHighPrivilege = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal].includes(designation);
            
            if (isHighPrivilege) {
                // High privilege can contact HODs and Incharges.
                const targets = Array.from(adminDirectory.values()).filter((admin: AdminInfo) =>
                    (admin.designation === Designation.HOD || admin.designation === Designation.Incharge) &&
                    admin.idNumber !== idNumber
                );
                return targets.sort((a: AdminInfo, b: AdminInfo) => a.name.localeCompare(b.name));
            }

            if (designation === Designation.HOD) {
                // HOD can contact all staff and students in their department, plus high privilege admins.
                const contacts: (StudentInfo | AdminInfo)[] = [];
                
                // Add students from their department
                studentDirectory.forEach(student => {
                    if (student.department === department) {
                        contacts.push(student);
                    }
                });

                // Add staff from their department (excluding self) and high-privilege staff
                adminDirectory.forEach(admin => {
                    const isAdminHighPrivilege = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal].includes(admin.designation);
                    if (admin.idNumber !== idNumber && (admin.department === department || isAdminHighPrivilege)) {
                        contacts.push(admin);
                    }
                });
                
                return contacts.sort((a, b) => a.name.localeCompare(b.name));
            }

            // For Teachers and Incharges, the logic is based on the classes they teach.
            if (timeTable) {
                const studentIds = new Set<string>();
                timeTable.forEach(entry => {
                    if (entry.teacherId === idNumber) {
                        studentDirectory.forEach(student => {
                            if (student.department === entry.department && student.year === entry.year && student.section === entry.section) {
                                studentIds.add(student.rollNumber);
                            }
                        });
                    }
                });
                // Teachers can also contact their HOD and high privilege admins.
                const contactableAdminIds = new Set<string>();
                adminDirectory.forEach(admin => {
                    const isAdminHighPrivilege = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal].includes(admin.designation);
                    const isOwnHOD = admin.designation === Designation.HOD && admin.department === department;
                    if(isAdminHighPrivilege || isOwnHOD) {
                        contactableAdminIds.add(admin.idNumber);
                    }
                });

                const studentContacts = Array.from(studentIds).map(id => studentDirectory.get(id)).filter((s): s is StudentInfo => !!s);
                const adminContacts = Array.from(contactableAdminIds).map(id => adminDirectory.get(id)).filter((a): a is AdminInfo => !!a);
                
                return [...studentContacts, ...adminContacts].sort((a, b) => a.name.localeCompare(b.name));
            }
            
            return [];

        } else { // currentUser.userType === 'STUDENT'
            const contactIds = new Set<string>();
            if (timeTable) {
                timeTable.forEach(entry => {
                    if (entry.department === currentUser.department && entry.year === currentUser.year && entry.section === currentUser.section) {
                        contactIds.add(entry.teacherId);
                    }
                });
            }
            adminDirectory.forEach(admin => {
                if (admin.designation === Designation.HOD && admin.department === currentUser.department) contactIds.add(admin.idNumber);
                if (admin.designation === Designation.Incharge && admin.department === currentUser.department && admin.year === currentUser.year && (admin.section === currentUser.section || admin.section === 'All Sections')) contactIds.add(admin.idNumber);
                if (admin.designation === Designation.Principal || admin.designation === Designation.Chairman || admin.designation === Designation.ExamsOffice || admin.designation === Designation.VicePrincipal) contactIds.add(admin.idNumber);
            });
            const roleOrder: Designation[] = [Designation.Chairman, Designation.Principal, Designation.VicePrincipal, Designation.ExamsOffice, Designation.HOD, Designation.Incharge, Designation.Teacher];
            return Array.from(contactIds).map(id => adminDirectory.get(id)).filter((t): t is AdminInfo => !!t).sort((a, b) => roleOrder.indexOf(a.designation) - roleOrder.indexOf(b.designation) || a.name.localeCompare(b.name));
        }
    }, [currentUser, timeTable, adminDirectory, studentDirectory]);
    
    const otherParticipant = selectedConversation ? getParticipantInfo(selectedConversation.participantIds.find(id => id !== currentUserId)!) : null;

    return (
        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 h-[75vh] flex shadow-lg">
            {viewingSource && <SourceViewerModal document={viewingSource} onClose={() => setViewingSource(null)} />}
            
            {/* List Panel */}
            <div className={`w-full md:w-[360px] bg-gray-100 dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-800 flex-col flex-shrink-0 ${selectedConversationId || isNewChatView ? 'hidden md:flex' : 'flex'}`}>
                 <header className="p-3 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
                    <div className="flex items-center justify-between">
                         <h2 className="text-xl font-bold text-gray-800 dark:text-white">Chats</h2>
                        <button onClick={() => {setIsNewChatView(true); setSelectedConversationId(null)}} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                    </div>
                    <div className="relative mt-2">
                        <SearchIcon className="w-4 h-4 text-gray-400 absolute top-1/2 left-3 transform -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-200 dark:bg-gray-800 border-transparent rounded-lg pl-9 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>
                </header>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <ul>
                        {sortedConversations.map(convo => {
                            const otherId = convo.participantIds.find(id => id !== currentUserId);
                            const participant = otherId ? getParticipantInfo(otherId) : null;
                            if (!participant) return null;
                            const lastMessage = convo.messages[convo.messages.length - 1];
                            const isPriority = lastMessage?.isPriority && lastMessage.senderId !== currentUserId;
                            return (
                                <li key={convo.id} onClick={() => handleSelectConversation(convo.id)} className={`p-3 cursor-pointer border-l-4 flex items-center gap-3 ${selectedConversationId === convo.id ? 'bg-gray-200 dark:bg-gray-700/50 border-blue-500' : 'border-transparent hover:bg-gray-200/50 dark:hover:bg-gray-700/30'}`}>
                                    <Avatar photoBase64={participant.photoBase64} name={participant.name} />
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-gray-800 dark:text-white truncate">{participant.name}</p>
                                            {lastMessage && <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">{new Date(lastMessage.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>}
                                        </div>
                                        <div className="flex justify-between items-center">
                                        {lastMessage ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                                {lastMessage.senderId === currentUserId && "You: "}{lastMessage.file ? `📄 ${lastMessage.file.name}` : lastMessage.content}
                                            </p>
                                        ) : <p className="text-sm text-gray-500 dark:text-gray-400 italic">No messages yet</p>}
                                        {isPriority && <ExclamationIcon className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* Chat Panel */}
            <div className={`flex-grow flex-col ${selectedConversationId || isNewChatView ? 'flex' : 'hidden md:flex'}`}>
                 {isNewChatView ? (
                        <div className="flex flex-col h-full w-full bg-gray-200 dark:bg-gray-800">
                            <div className="p-4 border-b border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 flex items-center gap-2">
                                <button onClick={() => setIsNewChatView(false)} className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Start a new conversation</h3>
                            </div>
                            <div className="flex-grow overflow-y-auto p-2 custom-scrollbar">
                                <ul className="divide-y divide-gray-300 dark:divide-gray-700">
                                    {availableContacts.map((contact: StudentInfo | AdminInfo) => {
                                        const id = 'rollNumber' in contact ? contact.rollNumber : contact.idNumber;
                                        const type = 'rollNumber' in contact ? 'Student' : (contact as AdminInfo).designation;
                                        return (
                                            <li key={id} onClick={() => handleNewChat(id)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-700/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Avatar photoBase64={contact.photoBase64} name={contact.name} className="w-10 h-10" />
                                                    <div>
                                                        <p className="font-semibold text-gray-900 dark:text-white">{contact.name}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{type}</p>
                                                    </div>
                                                </div>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        </div>
                    ) : selectedConversation ? (
                         <div className="flex flex-grow min-h-0">
                            <div className={`flex flex-col h-full transition-all duration-300 ${isContextPanelOpen ? 'w-full lg:w-3/5' : 'w-full'}`}>
                                <header className="p-3 border-b border-gray-300 dark:border-gray-700 flex items-center justify-between bg-gray-100 dark:bg-gray-900/50 flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => handleSelectConversation(null)} className="md:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <Avatar photoBase64={otherParticipant?.photoBase64} name={otherParticipant?.name || '?'} className="w-10 h-10" />
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white">{otherParticipant?.name}</h3>
                                             {isTyping ? (
                                                <div className="flex items-center gap-1.5 text-xs text-blue-500 h-4">
                                                    typing...
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 h-4">{otherParticipant?.type === 'Admin' ? otherParticipant.designation : 'Student'}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => setIsContextPanelOpen(!isContextPanelOpen)} className={`p-2 rounded-full transition-colors ${isContextPanelOpen ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'}`} title="Conversation Info">
                                        <InfoIcon className="w-5 h-5" />
                                    </button>
                                </header>

                                <main ref={chatEndRef} className="flex-grow p-4 space-y-1 overflow-y-auto custom-scrollbar chat-bg">
                                    {groupContent.map(group => {
                                        if (group.type === 'date') return <DateSeparator key={group.id} date={new Date(group.date)} />;
                                        return group.messages.map((msg, index) => (
                                            <MessageBubble key={msg.id} message={msg} allMessages={selectedConversation.messages} isOwn={msg.senderId === currentUserId} senderType={getParticipantInfo(msg.senderId)?.type || 'Student'} isFirstInGroup={index === 0} isLastInGroup={index === group.messages.length - 1} onReply={setReplyingTo} onDelete={() => {}} />
                                        ));
                                    })}
                                     {aiChat && (
                                        <div className="py-4 space-y-4">
                                            <div className="flex flex-col items-end">
                                                <div className="relative max-w-md px-4 py-3 rounded-lg bg-blue-600 text-white">
                                                    <p className="text-xs font-bold opacity-80 mb-1 flex items-center gap-1"><SparklesIcon className="w-4 h-4" /> Asking AI...</p>
                                                    <p className="text-sm whitespace-pre-wrap">{aiChat.query}</p>
                                                </div>
                                            </div>
                                            <AIResponseBubble response={aiChat.response} setViewingSource={setViewingSource} />
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </main>
                                
                                <footer className="relative p-3 border-t border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900/50 flex-shrink-0">
                                    {replyingTo && (
                                        <div className="bg-gray-200 dark:bg-gray-700/50 p-2 border-l-4 border-blue-500 flex justify-between items-center text-sm mb-2 rounded-md">
                                            <div>
                                                <p className="text-gray-600 dark:text-gray-400">Replying to <span className="font-bold text-blue-500 dark:text-blue-300">{replyingTo.senderId === currentUserId ? 'yourself' : otherParticipant?.name}</span></p>
                                                <p className="text-gray-800 dark:text-gray-200 italic truncate">{replyingTo.content || 'Attachment'}</p>
                                            </div>
                                            <button onClick={() => setReplyingTo(null)} className="p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 text-xl">&times;</button>
                                        </div>
                                    )}
                                    {showEmojiPicker && <EmojiPicker ref={emojiPickerRef} onEmojiSelect={(emoji) => { setNewMessage(prev => prev + emoji); }} />}
                                    {currentUser.userType === 'ADMIN' && (
                                        <div className="flex items-center justify-end gap-2 mb-2"><label htmlFor="priority-toggle" className="text-xs font-medium text-gray-500 dark:text-gray-400">Mark as Important</label><ToggleSwitch checked={isPriority} onChange={setIsPriority} /></div>
                                    )}
                                    {file && (
                                        <div className="mb-2 p-2 bg-gray-200 dark:bg-gray-700/50 rounded-lg flex justify-between items-center text-sm">
                                            <span className="text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                                            <button onClick={() => {setFile(null); if(fileInputRef.current) fileInputRef.current.value = ''}} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-2">
                                        <div className="flex items-center py-1 pl-1 pr-1 bg-gray-200 dark:bg-gray-700 rounded-full w-full">
                                            <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(p => !p)} title="Emoji" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600">
                                                <FaceSmileIcon className="w-6 h-6" />
                                            </button>
                                            <input
                                                type="text"
                                                value={newMessage}
                                                onChange={e => setNewMessage(e.target.value)}
                                                onKeyPress={e => e.key === 'Enter' && handleSendMessageWrapper()}
                                                placeholder={onQueryKnowledgeBase ? "Type a message or /ai <question>..." : "Type a message..."}
                                                className="flex-grow bg-transparent text-gray-900 dark:text-white focus:outline-none px-2"
                                            />
                                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id="file-input-comm" />
                                            <label htmlFor="file-input-comm" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 cursor-pointer">
                                                <PaperClipIcon className="w-5 h-5" />
                                            </label>
                                        </div>
                                        <button onClick={handleSendMessageWrapper} disabled={isLoading || (!newMessage.trim() && !file)} className="w-12 h-12 flex-shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-500 disabled:bg-gray-500 dark:disabled:bg-gray-600 transition-colors">
                                            {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SendIcon className="w-5 h-5 transform rotate-90" />}
                                        </button>
                                    </div>
                                </footer>
                            </div>
                             {isContextPanelOpen && otherParticipant && selectedConversation && (
                                <div className="w-full lg:w-2/5 border-l border-gray-300 dark:border-gray-700 animate-fade-in hidden lg:block">
                                    <ContextPanel 
                                        participant={otherParticipant}
                                        conversation={selectedConversation}
                                        onClose={() => setIsContextPanelOpen(false)}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <ChatPlaceholder />
                    )}
            </div>
        </div>
    );
};