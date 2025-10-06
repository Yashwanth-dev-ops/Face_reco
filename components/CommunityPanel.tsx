import React, { useState } from 'react';
import { StudentInfo, StudyGroup, SharedNote, GroupTask, GroupEvent } from '../types';
import { StudyGroupsPanel } from './StudyGroupsPanel';
import { NotesExchangePanel } from './NotesExchangePanel';
import { UsersIcon } from './UsersIcon';
import { DocumentTextIcon } from './DocumentTextIcon';
import { FolderIcon } from './FolderIcon';
import { ResourcesPanel } from './ResourcesPanel';

interface CommunityPanelProps {
    currentUser: StudentInfo;
    studyGroups: StudyGroup[];
    sharedNotes: SharedNote[];
    studentDirectory: Map<string, StudentInfo>;
    onCreateStudyGroup: (groupData: Omit<StudyGroup, 'id' | 'events' | 'messages'>) => Promise<void>;
    onJoinStudyGroup: (groupId: string) => Promise<void>;
    onDeclineStudyGroupInvitation: (groupId: string) => Promise<void>;
    onSendGroupMessage: (groupId: string, content: string, file?: { name: string; url: string }, audio?: { url: string; duration: number }, replyToMessageId?: string) => Promise<void>;
    onDeleteGroupMessage: (groupId: string, messageId: string, deleteType: 'me' | 'everyone') => Promise<void>;
    onDeleteGroupResource: (groupId: string, resourceId: string) => Promise<void>;
    onUploadNote: (noteData: Omit<SharedNote, 'id' | 'ratings' | 'createdAt'>) => Promise<void>;
    onRateNote: (noteId: string, rating: number) => Promise<void>;
    onSuggestStudyTime: (groupId: string) => Promise<{ dayOfWeek: number, startTime: string, reason: string }[]>;
    onSummarizeNote: (noteId: string) => Promise<string>;
    onPinMessage: (groupId: string, messageId: string) => Promise<void>;
    onAddTask: (groupId: string, task: Omit<GroupTask, 'id' | 'completed'>) => Promise<void>;
    onToggleTask: (groupId: string, taskId: string) => Promise<void>;
    onDeleteStudyGroup: (groupId: string) => Promise<void>;
    onAddMemberToGroup: (groupId: string, studentRollNumber: string) => Promise<void>;
    onScheduleEvent: (groupId: string, eventData: Omit<GroupEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (groupId: string, eventId: string) => Promise<void>;
}

type CommunityTab = 'groups' | 'notes' | 'resources';

export const CommunityPanel: React.FC<CommunityPanelProps> = (props) => {
    const [activeTab, setActiveTab] = useState<CommunityTab>('groups');

    return (
        <div className="w-full animate-fade-in">
            <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 max-w-lg mx-auto">
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`w-full flex justify-center items-center gap-2 py-2 px-4 font-medium text-sm rounded-md transition-colors ${activeTab === 'groups' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                    >
                        <UsersIcon className="w-5 h-5" />
                        Study Groups
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`w-full flex justify-center items-center gap-2 py-2 px-4 font-medium text-sm rounded-md transition-colors ${activeTab === 'notes' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                    >
                        <DocumentTextIcon className="w-5 h-5" />
                        Notes Exchange
                    </button>
                     <button
                        onClick={() => setActiveTab('resources')}
                        className={`w-full flex justify-center items-center gap-2 py-2 px-4 font-medium text-sm rounded-md transition-colors ${activeTab === 'resources' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'}`}
                    >
                        <FolderIcon className="w-5 h-5" />
                        Resources
                    </button>
                </div>
            </div>

            <div>
                {activeTab === 'groups' && <StudyGroupsPanel {...props} />}
                {activeTab === 'notes' && <NotesExchangePanel {...props} />}
                {activeTab === 'resources' && <ResourcesPanel {...props} />}
            </div>
        </div>
    );
};