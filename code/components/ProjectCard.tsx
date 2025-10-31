
import React, { KeyboardEvent } from 'react';
import { Project, ProjectStatus } from '../types';

const ProjectCard: React.FC<{ project: Project; onSelect: (id: string) => void; isSelected: boolean }> = ({ project, onSelect, isSelected }) => {
    const statusColors: Record<ProjectStatus, string> = {
        [ProjectStatus.Active]: 'bg-green-500',
        [ProjectStatus.Idea]: 'bg-yellow-500',
        [ProjectStatus.Paused]: 'bg-orange-500',
        [ProjectStatus.Archived]: 'bg-slate-600',
    };

    return (
        <div
            onClick={() => onSelect(project.id)}
            className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${isSelected ? 'bg-slate-700/50 border-cyan-500' : 'bg-slate-800 border-slate-700 hover:border-slate-600'}`}
            role="button"
            aria-pressed={isSelected}
            tabIndex={0}
            onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(project.id);
                }
            }}
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-100">{project.title}</h3>
                <span className={`w-3 h-3 rounded-full mt-1 ${statusColors[project.status]}`} title={`Status: ${project.status}`}></span>
            </div>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{project.summary}</p>
        </div>
    );
};

export default ProjectCard;
