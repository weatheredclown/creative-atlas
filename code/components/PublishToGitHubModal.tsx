import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { GitHubIcon } from './Icons';

interface PublishToGitHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (repoName: string, publishDir: string) => Promise<void>;
    isPublishing: boolean;
}

interface GitHubRepo {
    fullName: string;
    name: string;
}

const PublishToGitHubModal: React.FC<PublishToGitHubModalProps> = ({ isOpen, onClose, onPublish, isPublishing }) => {
    const [repoName, setRepoName] = useState('');
    const [publishDir, setPublishDir] = useState('');
    const [repos, setRepos] = useState<GitHubRepo[]>([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [showNewRepoInput, setShowNewRepoInput] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/github/repos')
                .then(res => res.json())
                .then(data => {
                    setRepos(data);
                    if (data.length > 0) {
                        setSelectedRepo(data[0].fullName);
                    } else {
                        setShowNewRepoInput(true);
                    }
                })
                .catch(err => {
                    console.error("Error fetching repos", err)
                    setShowNewRepoInput(true);
                });
        }
    }, [isOpen]);

    const handleRepoSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'new') {
            setShowNewRepoInput(true);
            setSelectedRepo('new');
        } else {
            setShowNewRepoInput(false);
            setSelectedRepo(value);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        const repoToPublish = showNewRepoInput ? repoName : selectedRepo;
        await onPublish(repoToPublish, publishDir);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Publish to GitHub">
            <form onSubmit={handleSubmit}>
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <GitHubIcon className="w-6 h-6" />
                        <h2 className="text-lg font-semibold">Publish Project to GitHub</h2>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">
                        Choose a GitHub repository to publish your project to as a GitHub Pages site.
                    </p>

                    <select
                        value={selectedRepo}
                        onChange={handleRepoSelection}
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        {repos.map(repo => (
                            <option key={repo.fullName} value={repo.fullName}>{repo.name}</option>
                        ))}
                        <option value="new">Create a new repository</option>
                    </select>

                    {showNewRepoInput && (
                        <input
                            type="text"
                            value={repoName}
                            onChange={(e) => setRepoName(e.target.value)}
                            placeholder="e.g., my-awesome-project"
                            className="mt-2 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            required
                        />
                    )}

                    <label htmlFor="publish-dir" className="text-sm text-slate-400 mt-4 block">Publish Directory (optional)</label>
                    <input
                        id="publish-dir"
                        type="text"
                        value={publishDir}
                        onChange={(e) => setPublishDir(e.target.value)}
                        placeholder="e.g., docs"
                        className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>
                <div className="flex justify-end p-4 bg-slate-800/50 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                        disabled={isPublishing}
                    >
                        {isPublishing ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PublishToGitHubModal;
