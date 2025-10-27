
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Project, Artifact, ProjectStatus, ArtifactType, ConlangLexeme, Quest, Relation, Achievement, Scene, TaskData, TaskState, CharacterData, WikiData, LocationData } from './types';
import { CubeIcon, BookOpenIcon, PlusIcon, TableCellsIcon, ShareIcon, ArrowDownTrayIcon, ViewColumnsIcon, ArrowUpTrayIcon, BuildingStorefrontIcon, FolderPlusIcon } from './components/Icons';
import Modal from './components/Modal';
import CreateArtifactForm from './components/CreateArtifactForm';
import CreateProjectForm from './components/CreateProjectForm';
import Quests from './components/Quests';
import Achievements from './components/Achievements';
import ArtifactDetail from './components/ArtifactDetail';
import GraphView from './components/GraphView';
import ConlangLexiconEditor from './components/ConlangLexiconEditor';
import StoryEditor from './components/StoryEditor';
import KanbanBoard from './components/KanbanBoard';
import CharacterEditor from './components/CharacterEditor';
import WikiEditor from './components/WikiEditor';
import LocationEditor from './components/LocationEditor';
import { exportArtifactsToCSV, exportArtifactToMarkdown, exportProjectAsStaticSite } from './utils/export';
import { importArtifactsFromCSV } from './utils/import';
import ProjectInsights from './components/ProjectInsights';
import { getStatusClasses, formatStatusLabel } from './utils/status';

// Mock data based on the product spec
const initialProjects: Project[] = [
  { id: 'proj-1', title: 'Tamenzut', summary: 'A series of high-fantasy novels.', status: ProjectStatus.Active, tags: ['novel', 'fantasy'] },
  { id: 'proj-2', title: 'Steamweave', summary: 'A coal-punk world of gears and magic.', status: ProjectStatus.Idea, tags: ['coal-punk', 'rpg'] },
];

const initialArtifacts: Artifact[] = [
  { id: 'art-1', projectId: 'proj-1', type: ArtifactType.Conlang, title: 'Darv', summary: 'The ancient language of the Darv people.', status: 'draft', tags: ['language'], relations: [], data: [
      { id: 'lex-1', lemma: 'brubber', pos: 'adj', gloss: 'strange; unusual', etymology: 'From Old Darv "brub", meaning "other".' },
  ]},
  { id: 'art-2', projectId: 'proj-1', type: ArtifactType.Character, title: 'Kaelen', summary: 'A rogue with a mysterious past.', status: 'draft', tags: ['protagonist'], relations: [{toId: 'art-1', kind: 'SPEAKS'}], data: { bio: 'Kaelen grew up on the streets of the Gilded City, learning to live by his wits.', traits: [{id: 't1', key: 'Age', value: '27'}] } },
  { id: 'art-3', projectId: 'proj-2', type: ArtifactType.Story, title: 'Shroud and Gears', summary: 'An introductory short story.', status: 'idea', tags: ['short-story'], relations: [], data: [] },
  { id: 'art-4', projectId: 'proj-2', type: ArtifactType.Task, title: 'Design main character', summary: 'Flesh out the protagonist for Shroud and Gears.', status: 'in-progress', tags: ['design'], relations: [], data: { state: TaskState.InProgress } },
  { id: 'art-5', projectId: 'proj-2', type: ArtifactType.Task, title: 'Outline Chapter 1', summary: 'Create beat sheet for the first chapter.', status: 'todo', tags: ['writing'], relations: [], data: { state: TaskState.Todo } },
  { id: 'art-6', projectId: 'proj-1', type: ArtifactType.Wiki, title: 'World Anvil', summary: 'Main wiki for the Tamenzut universe.', status: 'draft', tags: ['world-building'], relations: [], data: { content: '# Welcome to Tamenzut' } },
  { id: 'art-7', projectId: 'proj-1', type: ArtifactType.Location, title: 'The Gilded City', summary: 'A bustling desert metropolis.', status: 'draft', tags: ['city'], relations: [], data: { description: 'A city built on an oasis, known for its vibrant trade and towering spires of sandstone and gold.', features: [{id: 'f1', name: 'The Sunstone Market', description: 'A sprawling bazaar.'}] } },
];

const dailyQuests: Quest[] = [
    { id: 'q1', title: 'First Seed', description: 'Create at least one new artifact.', isCompleted: (artifacts) => artifacts.length > 7, xp: 5 },
    { id: 'q2', title: 'Task Master', description: 'Complete a task.', isCompleted: (artifacts) => artifacts.some(a => a.type === ArtifactType.Task && (a.data as TaskData).state === TaskState.Done), xp: 8 },
    { id: 'q3', title: 'Daily Forge', description: 'Create a seed and link it to another.', isCompleted: (artifacts) => artifacts.some(a => a.relations.length > 0), xp: 10 },
];

const achievements: Achievement[] = [
    { id: 'ach-1', title: 'World Builder', description: 'Create your first project.', isUnlocked: (_, projects) => projects.length > 2 },
    { id: 'ach-2', title: 'Polyglot', description: 'Create a Conlang artifact.', isUnlocked: (artifacts) => artifacts.some(a => a.type === ArtifactType.Conlang) },
    { id: 'ach-3', title: 'Cartographer', description: 'Create a Location artifact.', isUnlocked: (artifacts) => artifacts.some(a => a.type === ArtifactType.Location) },
    { id: 'ach-4', title: 'Connector', description: 'Link 3 artifacts together.', isUnlocked: (artifacts) => artifacts.reduce((acc, a) => acc + a.relations.length, 0) >= 3 },
];

const Header: React.FC<{ xp: number }> = ({ xp }) => (
  <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10 px-4 sm:px-8 py-3 flex justify-between items-center">
    <div className="flex items-center gap-3">
      <CubeIcon className="w-7 h-7 text-cyan-400" />
      <h1 className="text-xl font-bold text-slate-100">Creative Atlas</h1>
    </div>
    <div className="flex items-center gap-4">
        <div className="text-sm font-medium text-slate-400">Creator Level 1</div>
        <div className="relative w-32 h-6 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500" style={{ width: `${(xp/100)*100}%` }}></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white tracking-wider">{xp} / 100 XP</span>
        </div>
    </div>
  </header>
);

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
        >
            <div className="flex justify-between items-start">
                <h3 className="font-bold text-slate-100">{project.title}</h3>
                <span className={`w-3 h-3 rounded-full mt-1 ${statusColors[project.status]}`} title={`Status: ${project.status}`}></span>
            </div>
            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{project.summary}</p>
        </div>
    );
};

const ArtifactListItem: React.FC<{ artifact: Artifact; onSelect: (id: string) => void; isSelected: boolean }> = ({ artifact, onSelect, isSelected }) => (
    <tr
        onClick={() => onSelect(artifact.id)}
        className={`border-b border-slate-800 cursor-pointer transition-colors ${isSelected ? 'bg-cyan-900/30' : 'hover:bg-slate-700/50'}`}
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
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


export default function App() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [artifacts, setArtifacts] = useState<Artifact[]>(initialArtifacts);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjects[0]?.id || null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [xp, setXp] = useState<number>(25);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'graph' | 'kanban'>('table');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addXp = useCallback((amount: number) => {
    setXp(currentXp => Math.min(currentXp + amount, 100));
  }, []);

  const handleUpdateArtifactData = useCallback((artifactId: string, data: any) => {
    setArtifacts(currentArtifacts => 
        currentArtifacts.map(art => {
            if (art.id === artifactId) {
                if (art.type === ArtifactType.Task && (data as TaskData).state === TaskState.Done && (art.data as TaskData).state !== TaskState.Done) {
                    addXp(8); // XP Source: close task (+8)
                }
                return { ...art, data };
            }
            return art;
        })
    );
  }, [addXp]);

  const handleUpdateArtifact = useCallback((updatedArtifact: Artifact) => {
    setArtifacts(currentArtifacts => currentArtifacts.map(art => art.id === updatedArtifact.id ? updatedArtifact : art));
  }, []);

  const handleAddRelation = useCallback((fromId: string, toId: string, kind: string) => {
    setArtifacts(currentArtifacts => currentArtifacts.map(art => {
        if (art.id === fromId) {
            const newRelation: Relation = { toId, kind };
            return { ...art, relations: [...art.relations, newRelation] };
        }
        return art;
    }));
  }, []);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSelectedArtifactId(null);
  };

  const handleCreateProject = useCallback(({ title, summary }: { title: string; summary: string }) => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      title,
      summary,
      status: ProjectStatus.Active,
      tags: [],
    };

    setProjects(prev => [...prev, newProject]);
    addXp(5);
    setIsCreateProjectModalOpen(false);
    setSelectedProjectId(newProject.id);
    setSelectedArtifactId(null);
  }, [addXp]);

  const handleCreateArtifact = useCallback(({ title, type, summary }: { title: string; type: ArtifactType; summary: string }) => {
    if (!selectedProjectId) return;

    let data: Artifact['data'] = {};
    if (type === ArtifactType.Conlang) data = [];
    if (type === ArtifactType.Story) data = [];
    if (type === ArtifactType.Task) data = { state: TaskState.Todo };
    if (type === ArtifactType.Character) data = { bio: '', traits: [] };
    if (type === ArtifactType.Wiki) data = { content: `# ${title}\n\n` };
    if (type === ArtifactType.Location) data = { description: '', features: [] };

    const newArtifact: Artifact = {
      id: `art-${Date.now()}`,
      projectId: selectedProjectId,
      title,
      type,
      summary,
      status: 'idea',
      tags: [],
      relations: [],
      data,
    };

    setArtifacts(prev => [...prev, newArtifact]);
    addXp(5);
    setIsCreateModalOpen(false);
    setSelectedArtifactId(newArtifact.id);
  }, [selectedProjectId, addXp]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedProjectId) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const imported = importArtifactsFromCSV(content, selectedProjectId);
            
            const existingIds = new Set(artifacts.map(a => a.id));
            const newArtifacts = imported.filter(i => !existingIds.has(i.id));
            
            if (newArtifacts.length > 0) {
                setArtifacts(prev => [...prev, ...newArtifacts]);
                alert(`${newArtifacts.length} new artifacts imported successfully!`);
            } else {
                alert('No new artifacts to import. All IDs in the file already exist.');
            }
        } catch (error) {
            alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handlePublish = () => {
    if (selectedProject && projectArtifacts.length > 0) {
        exportProjectAsStaticSite(selectedProject, projectArtifacts);
        addXp(25); // XP Source: publish (+25)
    } else {
        alert('Please select a project with artifacts to publish.');
    }
  };

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId), [projects, selectedProjectId]);
  const projectArtifacts = useMemo(() => artifacts.filter(a => a.projectId === selectedProjectId), [artifacts, selectedProjectId]);
  const selectedArtifact = useMemo(() => artifacts.find(a => a.id === selectedArtifactId), [artifacts, selectedArtifactId]);

  const ViewSwitcher = () => (
    <div className="flex items-center gap-1 p-1 bg-slate-700/50 rounded-lg">
        <button onClick={() => setViewMode('table')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'table' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <TableCellsIcon className="w-4 h-4" /> Table
        </button>
        <button onClick={() => setViewMode('graph')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'graph' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ShareIcon className="w-4 h-4" /> Graph
        </button>
        <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${viewMode === 'kanban' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}>
            <ViewColumnsIcon className="w-4 h-4" /> Kanban
        </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header xp={xp} />
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 sm:p-8">
        <aside className="lg:col-span-3 space-y-6">
          <div>
            <div className="flex justify-between items-center px-2 mb-4">
                <h2 className="text-lg font-semibold text-slate-300">Projects</h2>
                <button 
                    onClick={() => setIsCreateProjectModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-cyan-300 bg-cyan-900/50 hover:bg-cyan-800/50 rounded-md transition-colors"
                    title="Create New Project"
                >
                    <FolderPlusIcon className="w-4 h-4" />
                    New
                </button>
            </div>
            <div className="space-y-3">
                {projects.map(p => (
                    <ProjectCard key={p.id} project={p} onSelect={handleSelectProject} isSelected={p.id === selectedProjectId} />
                ))}
            </div>
          </div>
          <Quests quests={dailyQuests} artifacts={artifacts} projects={projects} />
          <Achievements achievements={achievements} artifacts={artifacts} projects={projects} />
        </aside>

        <section className="lg:col-span-9 space-y-8">
          {selectedProject ? (
            <>
              <ProjectInsights artifacts={projectArtifacts} />

              <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">Artifacts in {selectedProject.title}</h2>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".csv" className="hidden" />
                        <button onClick={handleImportClick} title="Import from CSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowUpTrayIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => exportArtifactsToCSV(projectArtifacts, selectedProject.title)} title="Export to CSV" className="p-2 text-sm font-semibold text-slate-300 bg-slate-700/50 hover:bg-slate-700 rounded-md transition-colors">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <ViewSwitcher />
                        <button onClick={handlePublish} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-500 rounded-md transition-colors shadow-lg hover:shadow-green-500/50">
                            <BuildingStorefrontIcon className="w-5 h-5" />
                            Publish Site
                        </button>
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors shadow-lg hover:shadow-cyan-500/50"
                        >
                            <PlusIcon className="w-5 h-5" />
                            New Seed
                        </button>
                    </div>
                </div>
                {viewMode === 'table' && (
                    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="border-b border-slate-700 bg-slate-800">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-slate-300">Title</th>
                                    <th className="p-3 text-sm font-semibold text-slate-300">Type</th>
                                    <th className="p-3 text-sm font-semibold text-slate-300">Stage</th>
                                    <th className="p-3 text-sm font-semibold text-slate-300 hidden lg:table-cell">Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectArtifacts.length > 0 ? (
                                    projectArtifacts.map(art => (
                                        <ArtifactListItem key={art.id} artifact={art} onSelect={setSelectedArtifactId} isSelected={art.id === selectedArtifactId} />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="text-center p-8 text-slate-500">No artifacts in this project yet. Create a new seed!</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                {viewMode === 'graph' && <GraphView artifacts={projectArtifacts} onNodeClick={setSelectedArtifactId} />}
                {viewMode === 'kanban' && <KanbanBoard artifacts={projectArtifacts} onUpdateArtifactData={handleUpdateArtifactData} />}
              </div>

              {selectedArtifact && (
                <div className="space-y-8">
                    <ArtifactDetail 
                        artifact={selectedArtifact}
                        projectArtifacts={projectArtifacts}
                        onUpdateArtifact={handleUpdateArtifact}
                        onAddRelation={handleAddRelation}
                        addXp={addXp}
                    />
                    {selectedArtifact.type === ArtifactType.Conlang && (
                        <ConlangLexiconEditor 
                            artifact={selectedArtifact} 
                            conlangName={selectedProject.title}
                            onLexemesAdded={(id, lexemes) => handleUpdateArtifactData(id, [...(selectedArtifact.data as ConlangLexeme[]), ...lexemes])}
                            addXp={addXp}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Story && (
                        <StoryEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, scenes) => handleUpdateArtifactData(id, scenes)}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Character && (
                        <CharacterEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Wiki && (
                        <WikiEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                    {selectedArtifact.type === ArtifactType.Location && (
                        <LocationEditor
                            artifact={selectedArtifact}
                            onUpdateArtifactData={(id, data) => handleUpdateArtifactData(id, data)}
                        />
                    )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
                <p className="text-slate-500">Select a project to view its artifacts.</p>
            </div>
          )}
        </section>
      </main>
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Seed a New Artifact"
      >
        <CreateArtifactForm
          onCreate={handleCreateArtifact}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </Modal>
      <Modal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        title="Create a New Project"
      >
        <CreateProjectForm
            onCreate={handleCreateProject}
            onClose={() => setIsCreateProjectModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
