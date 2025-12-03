import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function Redirect() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing Spotify authentication...');

  useEffect(() => {
    // Check for error or code in URL parameters
    const error = searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (error) {
      setStatus('error');
      setMessage(`Authentication failed: ${error}. Please try again.`);
    } else if (code) {
      // Successfully received authorization code
      setStatus('success');
      setMessage('Successfully connected to Spotify! Redirecting...');
      
      // Redirect to home after a short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } else {
      // No parameters, just show loading
      setStatus('loading');
      setMessage('Waiting for Spotify authentication...');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-lg p-8 space-y-6">
        <div className="text-center space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
              <h1 className="text-2xl font-semibold text-slate-900">Connecting to Spotify</h1>
              <p className="text-slate-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-2xl font-semibold text-slate-900">Connection Successful</h1>
              <p className="text-slate-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h1 className="text-2xl font-semibold text-slate-900">Connection Failed</h1>
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/')}
          >
            Go to Home
          </Button>
          {status === 'error' && (
            <Button
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

