
import { Artifact, ArtifactType, Relation, ConlangLexeme, Scene, TaskData, TaskState, CharacterData, WikiData, LocationData } from '../types';

const getDefaultDataForType = (type: ArtifactType): Artifact['data'] => {
    switch (type) {
        case ArtifactType.Conlang:
        case ArtifactType.Story:
            return [];
        case ArtifactType.Task:
            return { state: TaskState.Todo } as TaskData;
        case ArtifactType.Character:
            return { bio: '', traits: [] } as CharacterData;
        case ArtifactType.Wiki:
            return { content: '' } as WikiData;
        case ArtifactType.Location:
            return { description: '', features: [] } as LocationData;
        default:
            return {};
    }
};

const parseArtifactData = (type: ArtifactType, rawData?: string): Artifact['data'] => {
    if (!rawData) {
        return getDefaultDataForType(type);
    }

    try {
        const parsed = JSON.parse(rawData);

        switch (type) {
            case ArtifactType.Conlang:
                return Array.isArray(parsed) ? parsed as ConlangLexeme[] : getDefaultDataForType(type);
            case ArtifactType.Story:
                return Array.isArray(parsed) ? parsed as Scene[] : getDefaultDataForType(type);
            case ArtifactType.Task:
                return (parsed && typeof parsed === 'object') ? parsed as TaskData : getDefaultDataForType(type);
            case ArtifactType.Character: {
                if (parsed && typeof parsed === 'object') {
                    const character = parsed as CharacterData;
                    return {
                        bio: typeof character.bio === 'string' ? character.bio : '',
                        traits: Array.isArray(character.traits) ? character.traits : [],
                    };
                }
                return getDefaultDataForType(type);
            }
            case ArtifactType.Wiki: {
                if (parsed && typeof parsed === 'object') {
                    const wiki = parsed as WikiData;
                    return { content: typeof wiki.content === 'string' ? wiki.content : '' };
                }
                return getDefaultDataForType(type);
            }
            case ArtifactType.Location: {
                if (parsed && typeof parsed === 'object') {
                    const location = parsed as LocationData;
                    return {
                        description: typeof location.description === 'string' ? location.description : '',
                        features: Array.isArray(location.features) ? location.features : [],
                    };
                }
                return getDefaultDataForType(type);
            }
            default:
                return parsed ?? {};
        }
    } catch (error) {
        console.warn(`Failed to parse data for artifact type ${type}:`, error);
        return getDefaultDataForType(type);
    }
};

// A simple CSV parser that handles quoted fields.
const parseCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
                current += '"';
                i++; // Skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
};

export const importArtifactsFromCSV = (csvString: string, currentProjectId: string, ownerId: string): Artifact[] => {
    const importedArtifacts: Artifact[] = [];
    const rows = csvString.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) {
        throw new Error('CSV file must have a header and at least one data row.');
    }

    const header = rows[0].split(',').map(h => h.trim());
    const requiredHeaders = ['id', 'type', 'title'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new Error(`CSV header is missing required columns. Must include: ${requiredHeaders.join(', ')}`);
    }

    for (let i = 1; i < rows.length; i++) {
        try {
            const values = parseCsvRow(rows[i]);
            const rowData: { [key: string]: string } = {};
            header.forEach((h, index) => {
                rowData[h] = values[index] ?? '';
            });

            const artifactType = rowData.type as ArtifactType;

            if (!Object.values(ArtifactType).includes(artifactType)) {
                console.warn(`Skipping row ${i+1}: Invalid artifact type '${rowData.type}'`);
                continue;
            }

            const relations: Relation[] = (rowData.relations || '')
                .split(';')
                .filter(r => r.includes(':'))
                .map(r => {
                    const [kind, toId] = r.split(':');
                    return { kind, toId };
                });

            const now = new Date().toISOString();
            const artifact: Artifact = {
                id: rowData.id,
                type: artifactType,
                projectId: rowData.projectId || currentProjectId,
                title: rowData.title,
                summary: rowData.summary || '',
                status: rowData.status || 'idea',
                tags: (rowData.tags || '').split(';').filter(t => t),
                relations: relations,
                data: parseArtifactData(artifactType, rowData.data),
                ownerId,
                createdAt: now,
                updatedAt: now,
            };

            // Basic validation
            if (!artifact.id || !artifact.title) {
                console.warn(`Skipping row ${i+1}: Missing required id or title.`);
                continue;
            }

            importedArtifacts.push(artifact);
        } catch (e) {
            console.error(`Error parsing row ${i+1}:`, e);
        }
    }

    return importedArtifacts;
};
