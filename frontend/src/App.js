import { useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  DisconnectButton,
  useTrackTranscription,
} from '@livekit/components-react';
import '@livekit/components-styles';

// LiveKit URL from environment (set in .env file)
const LIVEKIT_URL = process.env.REACT_APP_LIVEKIT_URL || 'wss://your-livekit-url.livekit.cloud';
const TOKEN_SERVER_URL = process.env.REACT_APP_TOKEN_SERVER_URL || 'http://localhost:8080';

function VoiceAssistantUI() {
  const { state, audioTrack } = useVoiceAssistant();
  const { segments } = useTrackTranscription();
  
  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '900px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', margin: '0' }}>🔥</h1>
        <h1 style={{ margin: '10px 0' }}>Goggins Accountability Agent</h1>
        <p style={{ color: '#666', margin: '0' }}>Stay hard. No excuses.</p>
      </div>

      {/* Audio Visualizer */}
      <div style={{ 
        height: '120px', 
        marginBottom: '30px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {audioTrack && (
          <BarVisualizer 
            state={state} 
            barCount={7} 
            trackRef={audioTrack}
            options={{ minHeight: 20 }}
          />
        )}
        {!audioTrack && (
          <p style={{ color: '#999' }}>Connecting to Goggins...</p>
        )}
      </div>

      {/* Status & Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px'
      }}>
        <div>
          <strong>Status:</strong>{' '}
          <span style={{ 
            color: state === 'speaking' ? '#22c55e' : state === 'listening' ? '#3b82f6' : '#666'
          }}>
            {state}
          </span>
        </div>
        <DisconnectButton style={{
          padding: '10px 20px',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600'
        }}>
          End Call
        </DisconnectButton>
      </div>

      {/* Live Transcript */}
      <div style={{ 
        padding: '30px', 
        backgroundColor: '#ffffff',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        minHeight: '400px',
        maxHeight: '600px',
        overflowY: 'auto'
      }}>
        <h3 style={{ marginTop: '0', marginBottom: '20px' }}>Live Transcript</h3>
        
        {segments.length === 0 && (
          <p style={{ color: '#999', fontStyle: 'italic' }}>
            Start talking to Goggins...
          </p>
        )}
        
        {segments.map((segment, i) => (
          <div 
            key={i} 
            style={{ 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: segment.participant.isAgent ? '#fef3c7' : '#e0f2fe',
              borderRadius: '8px',
              borderLeft: `4px solid ${segment.participant.isAgent ? '#f59e0b' : '#3b82f6'}`
            }}
          >
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '5px',
              color: segment.participant.isAgent ? '#92400e' : '#1e40af'
            }}>
              {segment.participant.isAgent ? '🔥 Goggins' : '👤 You'}
            </div>
            <div style={{ lineHeight: '1.6' }}>
              {segment.final ? segment.text : <em>{segment.text}</em>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const startCall = async () => {
    setIsConnecting(true);
    try {
      // Get token from token server
      const response = await fetch(`${TOKEN_SERVER_URL}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          room: 'goggins-room',
          identity: 'user-' + Math.random().toString(36).substring(7)
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to get token');
      }
      
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error('Failed to connect:', error);
      alert(`Failed to connect. Make sure the token server is running at ${TOKEN_SERVER_URL}.`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Landing page before call starts
  if (!token) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '30px',
        backgroundColor: '#f9fafb',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '72px', margin: '0' }}>🔥</h1>
          <h1 style={{ fontSize: '48px', margin: '20px 0 10px' }}>
            Goggins Accountability Agent
          </h1>
          <p style={{ fontSize: '20px', color: '#666', margin: '0' }}>
            Stay hard. No excuses.
          </p>
          <p style={{ fontSize: '16px', color: '#999', marginTop: '10px' }}>
            Powered by RAG over "Can't Hurt Me"
          </p>
        </div>
        
        <button 
          onClick={startCall} 
          disabled={isConnecting}
          style={{
            padding: '20px 40px',
            fontSize: '20px',
            fontWeight: '600',
            backgroundColor: '#000',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            opacity: isConnecting ? 0.7 : 1,
            transition: 'all 0.2s',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!isConnecting) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
          }}
        >
          {isConnecting ? 'Connecting...' : 'Start Call with Goggins'}
        </button>
        
        <div style={{ 
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#fff',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'left',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ marginTop: '0' }}>What to try:</h3>
          <ul style={{ lineHeight: '1.8', color: '#666' }}>
            <li>"What's the 40% rule?"</li>
            <li>"Tell me about Hell Week"</li>
            <li>"I'm too tired to work out"</li>
            <li>"Find me a gym nearby"</li>
          </ul>
        </div>
      </div>
    );
  }

  // Main call interface
  return (
    <LiveKitRoom
      token={token}
      serverUrl={LIVEKIT_URL}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={() => {
        setToken('');
        console.log('Disconnected from room');
      }}
      onError={(error) => {
        console.error('Room error:', error);
        alert('Connection error: ' + error.message);
      }}
    >
      <VoiceAssistantUI />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}