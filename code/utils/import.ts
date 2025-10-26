
import { Artifact, ArtifactType, Relation } from '../types';

// A simple CSV parser that handles quoted fields.
const parseCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"' && (i === 0 || row[i-1] !== '\\')) {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"'));
};

export const importArtifactsFromCSV = (csvString: string, currentProjectId: string): Artifact[] => {
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
                rowData[h] = values[index];
            });

            const relations: Relation[] = (rowData.relations || '')
                .split(';')
                .filter(r => r.includes(':'))
                .map(r => {
                    const [kind, toId] = r.split(':');
                    return { kind, toId };
                });

            const artifact: Artifact = {
                id: rowData.id,
                type: rowData.type as ArtifactType,
                projectId: rowData.projectId || currentProjectId,
                title: rowData.title,
                summary: rowData.summary || '',
                status: rowData.status || 'idea',
                tags: (rowData.tags || '').split(';').filter(t => t),
                relations: relations,
                data: {}, // Importer doesn't handle complex data field for now
            };
            
            // Basic validation
            if (!Object.values(ArtifactType).includes(artifact.type)) {
                console.warn(`Skipping row ${i+1}: Invalid artifact type '${artifact.type}'`);
                continue;
            }
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
