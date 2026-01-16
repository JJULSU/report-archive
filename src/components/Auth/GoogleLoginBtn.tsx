import { useGoogleLogin } from '@react-oauth/google';
import { useState, useEffect } from 'react';
import { GoogleDriveService } from '../../lib/googleDrive';
import { GOOGLE_CONFIG } from '../../config';
import { LogOut } from 'lucide-react';

interface UserProfile {
    name: string;
    picture: string;
    email: string;
}

export function GoogleLoginBtn() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [_accessToken, setAccessToken] = useState<string | null>(null);

    // Check for existing session (simplified)
    useEffect(() => {
        const savedToken = localStorage.getItem('google_access_token');
        const savedUser = localStorage.getItem('google_user_profile');
        if (savedToken && savedUser) {
            setAccessToken(savedToken);
            setUser(JSON.parse(savedUser));
            GoogleDriveService.setAccessToken(savedToken);
            GoogleDriveService.initClient(); // Pre-init GAPI
        }
    }, []);

    const login = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            console.log("Login Success", tokenResponse);
            setAccessToken(tokenResponse.access_token);
            GoogleDriveService.setAccessToken(tokenResponse.access_token);
            GoogleDriveService.initClient();

            localStorage.setItem('google_access_token', tokenResponse.access_token);

            // Fetch user profile
            try {
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                const profile = await res.json();
                setUser(profile);
                localStorage.setItem('google_user_profile', JSON.stringify(profile));
            } catch (err) {
                console.error("Failed to fetch user profile", err);
            }
        },
        onError: error => console.log('Login Failed:', error),
        scope: GOOGLE_CONFIG.SCOPES,
    });

    const logout = () => {
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_user_profile');

        // GAPI token revoke if needed, but client-side clear is usually enough for UI
    };

    if (user) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                    src={user.picture}
                    alt={user.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                    title={user.email}
                />
                <button
                    onClick={logout}
                    className="icon-btn"
                    title="Logout"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                    <LogOut size={18} color="#666" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => login()}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '20px',
                border: '1px solid #ddd',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
                color: '#3c4043'
            }}
        >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="18px" height="18px" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            Sign in
        </button>
    );
}
