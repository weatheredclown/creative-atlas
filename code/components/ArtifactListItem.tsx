
import React, { KeyboardEvent } from 'react';
import { Artifact } from '../types';
import { BookOpenIcon } from './Icons';
import { getStatusClasses, formatStatusLabel } from '../utils/status';

const ArtifactListItem: React.FC<{ artifact: Artifact; onSelect: (id: string) => void; isSelected: boolean }> = ({ artifact, onSelect, isSelected }) => (
    <tr
        onClick={() => onSelect(artifact.id)}
        className={`border-b border-slate-800 cursor-pointer transition-colors ${isSelected ? 'bg-cyan-900/30' : 'hover:bg-slate-700/50'}`}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
        onKeyDown={(event: KeyboardEvent<HTMLTableRowElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(artifact.id);
            }
        }}
    >
        <td className="p-3 flex items-center gap-3">
            <BookOpenIcon className="w-5 h-5 text-cyan-400 flex-shrink-0" />
            <span className="font-semibold">{artifact.title}</span>
        </td>
        <td className="p-3 text-slate-400">{artifact.type}</td>
        <td className="p-3">
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusClasses(artifact.status)}`}>
                {formatStatusLabel(artifact.status)}
            </span>
        </td>
        <td className="p-3 text-slate-500 hidden lg:table-cell">{artifact.summary}</td>
    </tr>
);

export default ArtifactListItem;
