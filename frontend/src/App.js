import { useState } from 'react';
import '@livekit/components-styles';
import UnifiedUI from './components/UnifiedUI';
import { TOKEN_SERVER_URL } from './utils/config';

export default function App() {
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  const startCall = async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const roomName = `goggins-room-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const identity = `user-${Math.random().toString(36).substring(7)}`;
      
      const response = await fetch(`${TOKEN_SERVER_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room: roomName,
          identity: identity
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get token');
      }
      
      const data = await response.json();
      setToken(data.participant_token);
    } catch (error) {
      setConnectionError(`Failed to connect. Make sure the token server is running at ${TOKEN_SERVER_URL}.`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setToken('');
    setConnectionError(null);
  };

  return (
    <UnifiedUI
      token={token}
      onStartCall={startCall}
      onDisconnect={handleDisconnect}
      isConnecting={isConnecting}
      error={connectionError}
    />
  );
}
