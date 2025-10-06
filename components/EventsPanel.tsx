import React, { useState, useMemo } from 'react';
import { StudyGroup, StudentInfo, GroupEvent } from '../types';
import { ConfirmationModal } from './ConfirmationModal';

interface EventsPanelProps {
    group: StudyGroup;
    currentUser: StudentInfo;
    onScheduleEvent: (groupId: string, eventData: Omit<GroupEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (groupId: string, eventId: string) => Promise<void>;
}

const ScheduleEventModal: React.FC<{
    onClose: () => void;
    onSave: (eventData: Omit<GroupEvent, 'id'>) => Promise<void>;
}> = ({ onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title || !startTime || !endTime) {
            setError('Title, start time, and end time are required.');
            return;
        }
        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        if (start >= end) {
            setError('End time must be after the start time.');
            return;
        }

        await onSave({ title, startTime: start, endTime: end, location });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-white mb-4">Schedule New Event</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                    <div>
                        <label className="text-sm text-gray-400">Start Time</label>
                        <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                    </div>
                    <div>
                        <label className="text-sm text-gray-400">End Time</label>
                        <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" required />
                    </div>
                    <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Location or Link (Optional)" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white" />
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600">Save Event</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const EventsPanel: React.FC<EventsPanelProps> = ({ group, currentUser, onScheduleEvent, onDeleteEvent }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<GroupEvent | null>(null);

    const { upcomingEvents, pastEvents } = useMemo(() => {
        const now = Date.now();
        const upcoming = (group.events || []).filter(e => e.endTime > now).sort((a,b)=> a.startTime - b.startTime);
        const past = (group.events || []).filter(e => e.endTime <= now).sort((a,b)=> b.startTime - a.startTime);
        return { upcomingEvents: upcoming, pastEvents: past };
    }, [group.events]);

    const isGroupAdmin = group.roles[currentUser.rollNumber] === 'admin';

    const formatDate = (timestamp: number) => new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

    const handleDelete = async () => {
        if (eventToDelete) {
            await onDeleteEvent(group.id, eventToDelete.id);
            setEventToDelete(null);
        }
    };

    return (
        <>
            {isModalOpen && <ScheduleEventModal onClose={() => setIsModalOpen(false)} onSave={(data) => onScheduleEvent(group.id, data)} />}
            {eventToDelete && (
                <ConfirmationModal
                    title="Delete Event"
                    message={`Are you sure you want to delete the event "${eventToDelete.title}"?`}
                    onConfirm={handleDelete}
                    onCancel={() => setEventToDelete(null)}
                    confirmText="Delete"
                    confirmColor="red"
                />
            )}
            <div className="p-4">
                <div className="flex justify-end mb-4">
                    <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg">
                        Schedule New Event
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <h4 className="font-bold text-lg text-white mb-2">Upcoming Events</h4>
                        {upcomingEvents.length > 0 ? (
                            <div className="space-y-2">
                                {upcomingEvents.map(event => (
                                    <div key={event.id} className="bg-gray-700/50 p-3 rounded-lg flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{event.title}</p>
                                            <p className="text-xs text-gray-400">{formatDate(event.startTime)} - {formatDate(event.endTime)}</p>
                                            {event.location && <p className="text-xs text-gray-300">Location: {event.location}</p>}
                                        </div>
                                        {isGroupAdmin && <button onClick={() => setEventToDelete(event)} className="text-xs text-red-400 hover:underline">Delete</button>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No upcoming events scheduled.</p>
                        )}
                    </div>

                    <div>
                        <h4 className="font-bold text-lg text-white mb-2">Past Events</h4>
                         {pastEvents.length > 0 ? (
                            <div className="space-y-2">
                                {pastEvents.map(event => (
                                    <div key={event.id} className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-start opacity-60">
                                        <div>
                                            <p className="font-semibold">{event.title}</p>
                                            <p className="text-xs text-gray-400">{formatDate(event.startTime)} - {formatDate(event.endTime)}</p>
                                            {event.location && <p className="text-xs text-gray-300">Location: {event.location}</p>}
                                        </div>
                                        {isGroupAdmin && <button onClick={() => setEventToDelete(event)} className="text-xs text-red-400 hover:underline">Delete</button>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">No past events.</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
