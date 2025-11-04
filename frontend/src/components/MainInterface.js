import { useEffect, useRef } from 'react';
import {
  useVoiceAssistant,
  BarVisualizer,
  useTranscriptions,
  useConnectionState,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { ParticipantKind } from 'livekit-client';

// Standalone version (when not in LiveKitRoom)
export function MainInterfaceStandalone({ onStartCall, onDisconnect, isConnecting, error }) {
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

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '15px 20px',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

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
        <p style={{ color: '#999' }}>Ready to start call</p>
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
          <strong>Connection:</strong>{' '}
          <span style={{ color: '#666' }}>disconnected</span>
        </div>
        <button
          onClick={onStartCall}
          disabled={isConnecting}
          style={{
            padding: '10px 20px',
            backgroundColor: '#000',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            opacity: isConnecting ? 0.7 : 1,
            fontWeight: '600'
          }}
        >
          {isConnecting ? 'Connecting...' : 'Start Call'}
        </button>
      </div>

      {/* Live Transcript - Chat Style */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f9fafb',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        minHeight: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ marginTop: '0', marginBottom: '10px', fontSize: '18px', color: '#374151' }}>Live Transcript</h3>
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
            Start a call to begin talking with Goggins
          </p>
        </div>
      </div>
    </div>
  );
}

// Connected version (when in LiveKitRoom)
export default function MainInterface({ onDisconnect }) {
  const { state, audioTrack } = useVoiceAssistant();
  const transcriptions = useTranscriptions();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const room = useRoomContext();
  
  // Check if agent is connected
  const agentParticipant = participants.find(p => p.kind === ParticipantKind.AGENT);
  const isAgentConnected = !!agentParticipant;
  
  // Listen for participant events to detect when agent connects
  useEffect(() => {
    if (!room) return;
    
    const handleParticipantConnected = (participant) => {
      if (participant.kind === ParticipantKind.AGENT) {
        console.log('✅ Agent connected!', participant.identity);
      }
    };
    
    const handleParticipantDisconnected = (participant) => {
      if (participant.kind === ParticipantKind.AGENT) {
        console.log('❌ Agent disconnected!', participant.identity);
      }
    };
    
    room.on('participantConnected', handleParticipantConnected);
    room.on('participantDisconnected', handleParticipantDisconnected);
    
    return () => {
      room.off('participantConnected', handleParticipantConnected);
      room.off('participantDisconnected', handleParticipantDisconnected);
    };
  }, [room]);
  
  // Convert transcriptions to segments format
  const segments = Array.isArray(transcriptions) 
    ? transcriptions.map((transcription, index) => {
        const participantIdentity = transcription.participantInfo?.identity;
        const participant = participantIdentity 
          ? participants.find(p => p.identity === participantIdentity)
          : null;
        
        // Determine if it's an agent message
        const isAgent = participant 
          ? participant.kind === ParticipantKind.AGENT
          : participantIdentity === agentParticipant?.identity;
        
        return {
          id: transcription.id || transcription.segmentId || index,
          text: transcription.text || transcription.message || '',
          final: transcription.final ?? transcription.isFinal ?? true,
          participant,
          timestamp: transcription.timestamp,
          isAgent,
        };
      })
    : [];

  // Auto-scroll to bottom when new messages arrive
  const transcriptEndRef = useRef(null);
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments.length]);

  const handleDisconnect = () => {
    room?.disconnect();
    onDisconnect();
  };

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
        {!isAgentConnected && connectionState === 'connected' ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#f59e0b', fontWeight: '600', marginBottom: '8px' }}>
              Waiting for Goggins to wake up...
            </p>
            <p style={{ color: '#999', fontSize: '14px' }}>
              This may take 10-20 seconds (cold start)
            </p>
          </div>
        ) : audioTrack ? (
          <BarVisualizer 
            state={state} 
            barCount={7} 
            trackRef={audioTrack}
            options={{ minHeight: 20 }}
          />
        ) : (
          <p style={{ color: '#999' }}>Connecting to room...</p>
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
          <strong>Connection:</strong>{' '}
          <span style={{ 
            color: connectionState === 'connected' ? '#22c55e' : 
                   connectionState === 'connecting' ? '#f59e0b' : '#ef4444'
          }}>
            {connectionState}
          </span>
          {' | '}
          <strong>Agent:</strong>{' '}
          <span style={{ 
            color: isAgentConnected ? '#22c55e' : '#ef4444'
          }}>
            {isAgentConnected ? 'Connected' : 'Not Connected'}
          </span>
          {' | '}
          <strong>State:</strong>{' '}
          <span style={{ 
            color: state === 'speaking' ? '#22c55e' : state === 'listening' ? '#3b82f6' : '#666'
          }}>
            {state}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            padding: '10px 20px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          End Call
        </button>
      </div>

      {/* Live Transcript - Chat Style */}
      <div style={{ 
        padding: '20px', 
        backgroundColor: '#f9fafb',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        minHeight: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <h3 style={{ marginTop: '0', marginBottom: '10px', fontSize: '18px', color: '#374151' }}>Live Transcript</h3>
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          justifyContent: segments.length === 0 ? 'center' : 'flex-start'
        }}>
          {segments.length === 0 ? (
            <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center' }}>
              {!isAgentConnected && connectionState === 'connected' 
                ? 'Waiting for Goggins to join the room...' 
                : 'Start talking to Goggins...'}
            </p>
          ) : (
            <>
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  style={{
                    display: 'flex',
                    justifyContent: segment.isAgent ? 'flex-start' : 'flex-end',
                    marginBottom: '4px'
                  }}
                >
                  <div
                    style={{
                      maxWidth: '70%',
                      padding: '12px 16px',
                      borderRadius: segment.isAgent ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                      backgroundColor: segment.isAgent ? '#fef3c7' : '#3b82f6',
                      color: segment.isAgent ? '#92400e' : '#ffffff',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      wordWrap: 'break-word'
                    }}
                  >
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '4px',
                      opacity: 0.8
                    }}>
                      {segment.isAgent ? 'Goggins' : 'You'}
                    </div>
                    <div style={{ 
                      lineHeight: '1.5',
                      fontSize: '15px'
                    }}>
                      {segment.final ? segment.text : <em>{segment.text}</em>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
