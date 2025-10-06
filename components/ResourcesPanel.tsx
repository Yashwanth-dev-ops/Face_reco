import React, { useMemo, useState } from 'react';
import { StudentInfo, StudyGroup, GroupResource, GroupMemberRole } from '../types';
import { DownloadIcon } from './DownloadIcon';
import { ConfirmationModal } from './ConfirmationModal';

interface ResourcesPanelProps {
    currentUser: StudentInfo;
    studyGroups: StudyGroup[];
    onDeleteGroupResource: (groupId: string, resourceId: string) => Promise<void>;
}

// A new type to hold the resource along with its source group
type AggregatedResource = GroupResource & { groupName: string; groupId: string; groupRoles: { [memberId: string]: GroupMemberRole } };

export const ResourcesPanel: React.FC<ResourcesPanelProps> = ({ currentUser, studyGroups, onDeleteGroupResource }) => {
    
    const [resourceToDelete, setResourceToDelete] = useState<AggregatedResource | null>(null);

    const allResources = useMemo((): AggregatedResource[] => {
        const myGroupIds = new Set(currentUser.studyGroupIds || []);
        const resources: AggregatedResource[] = [];

        studyGroups.forEach(group => {
            if (myGroupIds.has(group.id) && group.resources) {
                group.resources.forEach(resource => {
                    resources.push({
                        ...resource,
                        groupName: group.name,
                        groupId: group.id,
                        groupRoles: group.roles,
                    });
                });
            }
        });

        // Sort by most recent first
        return resources.sort((a, b) => b.uploadedAt - a.uploadedAt);
    }, [currentUser, studyGroups]);

    const handleDelete = async () => {
        if (resourceToDelete) {
            try {
                await onDeleteGroupResource(resourceToDelete.groupId, resourceToDelete.id);
            } catch (error) {
                console.error("Failed to delete resource:", error);
                // Optionally show an error to the user
            } finally {
                setResourceToDelete(null);
            }
        }
    };

    return (
        <>
            {resourceToDelete && (
                <ConfirmationModal
                    title="Delete Resource"
                    message={`Are you sure you want to permanently delete the file "${resourceToDelete.name}" from the group "${resourceToDelete.groupName}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setResourceToDelete(null)}
                    confirmText="Delete"
                    confirmColor="red"
                />
            )}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">All Shared Resources ({allResources.length})</h3>
                </div>
                {allResources.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p>No resources have been shared in your study groups yet.</p>
                        <p className="text-sm mt-1">Resources from your groups will appear here.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allResources.map(resource => {
                            const isUploader = resource.uploadedBy === currentUser.rollNumber;
                            const isGroupAdmin = resource.groupRoles[currentUser.rollNumber] === 'admin';
                            const canDelete = isUploader || isGroupAdmin;

                            return (
                                <div key={resource.id} className="bg-white dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white truncate">{resource.name}</p>
                                        <p className="text-sm text-blue-500 dark:text-blue-400">{resource.groupName}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Uploaded by: {resource.uploadedBy} on {new Date(resource.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-center gap-2 w-full">
                                        <a 
                                            href={resource.url} 
                                            download={resource.name} 
                                            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg font-semibold text-white bg-green-600 hover:bg-green-500 transition-all"
                                        >
                                            <DownloadIcon className="w-5 h-5" />
                                            <span>Download</span>
                                        </a>
                                        {canDelete && (
                                            <button
                                                onClick={() => setResourceToDelete(resource)}
                                                className="px-4 py-2 rounded-lg font-semibold text-white bg-red-600 hover:bg-red-500 transition-all"
                                                aria-label={`Delete resource ${resource.name}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
};