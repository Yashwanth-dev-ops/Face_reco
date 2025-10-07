import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, StudyGroup, GroupTask, GroupEvent, Gender } from '../types';
import { CreateStudyGroupModal } from './CreateStudyGroupModal';
import { UsersIcon } from './UsersIcon';
import { StudyGroupChatModal } from './StudyGroupChatModal';
import { ConfirmationModal } from './ConfirmationModal';

interface StudyGroupsPanelProps {
    currentUser: StudentInfo;
    studyGroups: StudyGroup[];
    studentDirectory: Map<string, StudentInfo>;
    onCreateStudyGroup: (groupData: Omit<StudyGroup, 'id' | 'events' | 'messages'>) => Promise<void>;
    onJoinStudyGroup: (groupId: string) => Promise<void>;
    onDeclineStudyGroupInvitation: (groupId: string) => Promise<void>;
    onSendGroupMessage: (groupId: string, content: string, file?: { name: string; url: string }, audio?: { url: string; duration: number }, replyToMessageId?: string) => Promise<void>;
    onDeleteGroupMessage: (groupId: string, messageId: string, deleteType: 'me' | 'everyone') => Promise<void>;
    onPinMessage: (groupId: string, messageId: string) => Promise<void>;
    onAddTask: (groupId: string, task: Omit<GroupTask, 'id' | 'completed'>) => Promise<void>;
    onToggleTask: (groupId: string, taskId: string) => Promise<void>;
    onDeleteGroupResource: (groupId: string, resourceId: string) => Promise<void>;
    onDeleteStudyGroup: (groupId: string) => Promise<void>;
    onAddMemberToGroup: (groupId: string, studentRollNumber: string) => Promise<void>;
    onScheduleEvent: (groupId: string, eventData: Omit<GroupEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (groupId: string, eventId: string) => Promise<void>;
}

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

export const StudyGroupsPanel: React.FC<StudyGroupsPanelProps> = (props) => {
    const { currentUser, studyGroups, onCreateStudyGroup, onJoinStudyGroup, onDeclineStudyGroupInvitation, onSendGroupMessage, onDeleteGroupMessage, onPinMessage, onAddTask, onToggleTask, onDeleteGroupResource, onDeleteStudyGroup, onAddMemberToGroup, studentDirectory, onScheduleEvent, onDeleteEvent } = props;
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeChatGroup, setActiveChatGroup] = useState<StudyGroup | null>(null);
    const [joinLoading, setJoinLoading] = useState<Record<string, boolean>>({});
    const [groupToDelete, setGroupToDelete] = useState<StudyGroup | null>(null);
    const [myGroupsSearch, setMyGroupsSearch] = useState('');

    useEffect(() => {
        if (activeChatGroup) {
            const updatedGroup = studyGroups.find(g => g.id === activeChatGroup.id);
            if (updatedGroup) {
                if (JSON.stringify(updatedGroup) !== JSON.stringify(activeChatGroup)) {
                    setActiveChatGroup(updatedGroup);
                }
            } else {
                setActiveChatGroup(null);
            }
        }
    }, [studyGroups, activeChatGroup]);

    const { myGroups, findableGroups, groupInvitations } = useMemo(() => {
        const myGroupIds = new Set(currentUser.studyGroupIds || []);
        const allMyGroups = studyGroups.filter(g => myGroupIds.has(g.id));
        
        const filteredMyGroups = myGroupsSearch.trim() === '' 
            ? allMyGroups 
            : allMyGroups.filter(g => 
                g.name.toLowerCase().includes(myGroupsSearch.toLowerCase()) || 
                g.subject.toLowerCase().includes(myGroupsSearch.toLowerCase())
            );

        const invitations = studyGroups.filter(g => g.pendingMembers?.includes(currentUser.rollNumber));
        
        const findable = studyGroups.filter(g => 
            !myGroupIds.has(g.id) &&
            !g.isPrivate &&
            !g.pendingMembers?.includes(currentUser.rollNumber)
        );
        return { myGroups: filteredMyGroups, findableGroups: findable, groupInvitations: invitations };
    }, [currentUser, studyGroups, myGroupsSearch]);
    
    const handleViewGroup = (group: StudyGroup) => {
        // @ts-ignore
        if (!document.startViewTransition) {
            setActiveChatGroup(group);
            return;
        }
        // @ts-ignore
        document.startViewTransition(() => {
            setActiveChatGroup(group);
        });
    };

    const handleCloseChat = () => {
        // @ts-ignore
        if (!document.startViewTransition) {
            setActiveChatGroup(null);
            return;
        }
        // @ts-ignore
        document.startViewTransition(() => {
            setActiveChatGroup(null);
        });
    };

    const handleJoin = async (groupId: string) => {
        setJoinLoading(prev => ({ ...prev, [groupId]: true }));
        try {
            await onJoinStudyGroup(groupId);
        } catch (error) {
            console.error('Failed to join group:', error);
            alert(error instanceof Error ? error.message : "Could not join group.");
        } finally {
            setJoinLoading(prev => ({ ...prev, [groupId]: false }));
        }
    };

    const handleDelete = async () => {
        if (groupToDelete) {
            await onDeleteStudyGroup(groupToDelete.id);
            setGroupToDelete(null);
        }
    };

    return (
        <>
            {isCreateModalOpen && (
                <CreateStudyGroupModal
                    currentUser={currentUser}
                    studentDirectory={studentDirectory}
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={onCreateStudyGroup}
                />
            )}
            {activeChatGroup && (
                <StudyGroupChatModal
                    group={activeChatGroup}
                    currentUser={currentUser}
                    studentDirectory={studentDirectory}
                    onClose={handleCloseChat}
                    onSendGroupMessage={onSendGroupMessage}
                    onDeleteGroupMessage={onDeleteGroupMessage}
                    onPinMessage={onPinMessage}
                    onAddTask={onAddTask}
                    onToggleTask={onToggleTask}
                    onDeleteGroupResource={onDeleteGroupResource}
                    onAddMemberToGroup={onAddMemberToGroup}
                    onScheduleEvent={onScheduleEvent}
                    onDeleteEvent={onDeleteEvent}
                />
            )}
            {groupToDelete && (
                <ConfirmationModal
                    title="Delete Study Group"
                    message={`Are you sure you want to permanently delete the group "${groupToDelete.name}"? This action cannot be undone.`}
                    onConfirm={handleDelete}
                    onCancel={() => setGroupToDelete(null)}
                    confirmText="Delete"
                    confirmColor="red"
                />
            )}
            <div className="space-y-6">
                {groupInvitations.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Group Invitations ({groupInvitations.length})</h3>
                        <div className="space-y-2">
                            {groupInvitations.map(group => (
                                <div key={group.id} className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-md flex justify-between items-center">
                                    <div className="flex items-center">
                                        <span className="text-2xl mr-3">{group.icon}</span>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">{group.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Invited by: {studentDirectory.get(group.createdBy)?.name || group.createdBy}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onJoinStudyGroup(group.id)} className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-500">Accept</button>
                                        <button onClick={() => onDeclineStudyGroupInvitation(group.id)} className="px-3 py-1 text-xs font-semibold text-gray-800 dark:text-white bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500">Decline</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Study Groups</h3>
                            <div className="relative">
                                <SearchIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 transform -translate-y-1/2" />
                                <input 
                                    type="text"
                                    placeholder="Search..."
                                    value={myGroupsSearch}
                                    onChange={e => setMyGroupsSearch(e.target.value)}
                                    className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-full pl-10 pr-4 py-1.5 text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {myGroups.length > 0 ? myGroups.map(group => {
                                const isGroupAdmin = group.roles[currentUser.rollNumber] === 'admin';
                                return (
                                    <div
                                        key={group.id}
                                        className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                                        style={{ viewTransitionName: `group-${group.id}` }}
                                    >
                                        <div className="flex items-start">
                                            <span className="text-3xl mr-4 mt-1">{group.icon}</span>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900 dark:text-white">{group.name}</p>
                                                    {group.genderRestriction === Gender.Male && <span title="Boys only" className="text-xs">♂️</span>}
                                                    {group.genderRestriction === Gender.Female && <span title="Girls only" className="text-xs">♀️</span>}
                                                </div>
                                                <p className="text-sm text-blue-500 dark:text-blue-400">{group.subject}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <UsersIcon className="w-4 h-4" />
                                                <span>{group.members.length} / {group.maxSize} members</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {isGroupAdmin && (
                                                    <button onClick={() => setGroupToDelete(group)} className="font-semibold text-red-500 hover:underline">Delete</button>
                                                )}
                                                <button onClick={() => handleViewGroup(group)} className="font-semibold text-blue-500 hover:underline">View</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-gray-500 text-center py-8">{myGroupsSearch ? 'No groups match your search.' : "You haven't joined any groups yet."}</p>}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Find Groups</h3>
                            <button onClick={() => setIsCreateModalOpen(true)} className="px-4 py-2 text-sm rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all">
                                Create Group
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                            {findableGroups.length > 0 ? findableGroups.map(group => {
                                const canJoinByDept = group.department === currentUser.department && group.year === currentUser.year;
                                const canJoinByGender = !group.genderRestriction || group.genderRestriction === currentUser.gender;
                                const canJoin = canJoinByDept && canJoinByGender;

                                const joinDisabled = joinLoading[group.id] || group.members.length >= group.maxSize || !canJoin;
                                let joinTitle = 'Join this group';
                                if (group.members.length >= group.maxSize) joinTitle = 'Group is full';
                                else if (!canJoinByDept) joinTitle = 'You can only self-join groups from your department and year. Ask a group admin for an invite.';
                                else if (!canJoinByGender) joinTitle = `This is a ${group.genderRestriction}s-only group.`;

                                return (
                                    <div key={group.id} className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-start">
                                            <span className="text-3xl mr-4 mt-1">{group.icon}</span>
                                            <div className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900 dark:text-white">{group.name}</p>
                                                    {group.genderRestriction === Gender.Male && <span title="Boys only" className="text-xs">♂️</span>}
                                                    {group.genderRestriction === Gender.Female && <span title="Girls only" className="text-xs">♀️</span>}
                                                </div>
                                                <p className="text-sm text-blue-500 dark:text-blue-400">{group.subject}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{group.department} / {group.year} {group.section ? `/ Sec ${group.section}` : ''}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{group.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                <UsersIcon className="w-4 h-4" />
                                                <span>{group.members.length} / {group.maxSize} members</span>
                                            </div>
                                            <button 
                                                onClick={() => handleJoin(group.id)} 
                                                disabled={joinDisabled}
                                                title={joinTitle}
                                                className="px-3 py-1 text-xs font-semibold text-white bg-green-600 rounded hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
                                            >
                                                {joinLoading[group.id] ? 'Joining...' : 'Join'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-gray-500 text-center py-8">No other public groups found in the university.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};