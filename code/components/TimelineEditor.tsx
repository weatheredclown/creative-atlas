import React, { useState } from 'react';
import { Artifact, TimelineData, TimelineEvent } from '../types';
import { PlusIcon, TrashIcon, PencilIcon } from './Icons';
import Modal from './Modal';

interface TimelineEditorProps {
    artifact: Artifact;
    onUpdateArtifactData: (id: string, data: TimelineData) => void;
}

const TimelineEditor: React.FC<TimelineEditorProps> = ({ artifact, onUpdateArtifactData }) => {
    const timelineData = (artifact.data as TimelineData) || { events: [] };
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

    const openModalForNew = () => {
        setEditingEvent({ id: '', date: '', title: '', description: '' });
        setIsModalOpen(true);
    };

    const openModalForEdit = (event: TimelineEvent) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleSave = (eventToSave: TimelineEvent) => {
        let updatedEvents;
        if (eventToSave.id) {
            // Editing existing
            updatedEvents = timelineData.events.map(event =>
                event.id === eventToSave.id ? eventToSave : event
            );
        } else {
            // Adding new
            updatedEvents = [...timelineData.events, { ...eventToSave, id: `ev-${Date.now()}` }];
        }
        onUpdateArtifactData(artifact.id, { events: updatedEvents });
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleDelete = (eventId: string) => {
        const updatedEvents = timelineData.events.filter(event => event.id !== eventId);
        onUpdateArtifactData(artifact.id, { events: updatedEvents });
    };

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-100">Timeline Editor</h3>
                <button
                    onClick={openModalForNew}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Event
                </button>
            </div>
            <div className="space-y-4">
                {timelineData.events.map(event => (
                    <div key={event.id} className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg">
                        <div className="flex-shrink-0 w-24 text-right">
                            <p className="font-semibold text-cyan-400">{event.date}</p>
                        </div>
                        <div className="flex-grow">
                            <h4 className="font-bold text-slate-200">{event.title}</h4>
                            <p className="text-sm text-slate-400">{event.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => openModalForEdit(event)}
                                className="p-1 text-slate-400 hover:text-white"
                                aria-label="Edit event"
                                title="Edit event"
                            >
                                <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(event.id)}
                                className="p-1 text-slate-400 hover:text-red-500"
                                aria-label="Delete event"
                                title="Delete event"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {isModalOpen && editingEvent && (
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEvent.id ? 'Edit Event' : 'Add New Event'}>
                    <TimelineEventForm
                        event={editingEvent}
                        onSave={handleSave}
                        onClose={() => setIsModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
};

interface TimelineEventFormProps {
    event: TimelineEvent;
    onSave: (event: TimelineEvent) => void;
    onClose: () => void;
}

const TimelineEventForm: React.FC<TimelineEventFormProps> = ({ event, onSave, onClose }) => {
    const [formData, setFormData] = useState(event);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-300">Date</label>
                <input
                    type="text"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-300">Title</label>
                <input
                    type="text"
                    name="title"
                    id="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300">Description</label>
                <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md">
                    Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-md">
                    Save
                </button>
            </div>
        </form>
    );
};

export default TimelineEditor;