import React from 'react';
import {
  useVoiceAssistant,
  BarVisualizer,
  useTranscriptions,
  useConnectionState,
  useParticipants,
  useRoomContext,
} from '@livekit/components-react';
import { ParticipantKind } from 'livekit-client';

export default function CallInterface({ onDisconnect }) {
  const { state, audioTrack } = useVoiceAssistant();
  const transcriptions = useTranscriptions();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const room = useRoomContext();
  
  // Check if agent is connected
  const agentParticipant = participants.find(p => p.kind === ParticipantKind.AGENT);
  const isAgentConnected = !!agentParticipant;
  
  // Convert transcriptions to segments format
  const segments = Array.isArray(transcriptions) 
    ? transcriptions.map((transcription, index) => ({
        id: transcription.id || transcription.segmentId || index,
        text: transcription.text || transcription.message || '',
        final: transcription.final !== undefined ? transcription.final : transcription.isFinal !== undefined ? transcription.isFinal : true,
        participant: transcription.participant,
        timestamp: transcription.timestamp,
      }))
    : [];

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
        {audioTrack ? (
          <BarVisualizer 
            state={state} 
            barCount={7} 
            trackRef={audioTrack}
            options={{ minHeight: 20 }}
          />
        ) : (
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
        
        {segments.map((segment) => (
          <div 
            key={segment.id} 
            style={{ 
              marginBottom: '20px',
              padding: '15px',
              backgroundColor: segment.participant?.kind === ParticipantKind.AGENT ? '#fef3c7' : '#e0f2fe',
              borderRadius: '8px',
              borderLeft: `4px solid ${segment.participant?.kind === ParticipantKind.AGENT ? '#f59e0b' : '#3b82f6'}`
            }}
          >
            <div style={{ 
              fontWeight: '600', 
              marginBottom: '5px',
              color: segment.participant?.kind === ParticipantKind.AGENT ? '#92400e' : '#1e40af'
            }}>
              {segment.participant?.kind === ParticipantKind.AGENT ? '🔥 Goggins' : '👤 You'}
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

