import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../services/dataApi';
import { useAuth } from '../contexts/AuthContext';

const GitHubCallback: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { getIdToken } = useAuth();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');

        if (code) {
            const exchange = async () => {
                try {
                    const token = await getIdToken();
                    const { accessToken } = await exchangeCodeForToken(token, code);
                    sessionStorage.setItem('githubAccessToken', accessToken);
                    navigate('/');
                } catch (err) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred.');
                }
            };
            void exchange();
        } else {
            setError('No code found in URL');
        }
    }, [location, getIdToken, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
            <div className="text-center">
                {error ? (
                    <>
                        <h1 className="text-2xl font-bold text-red-500">Error</h1>
                        <p className="mt-4">{error}</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-2xl font-bold">Authenticating with GitHub...</h1>
                        <p className="mt-4">Please wait while we complete the authentication process.</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default GitHubCallback;
