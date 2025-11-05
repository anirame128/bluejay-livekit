import { useMemo, useCallback } from 'react';
import {
  useTranscriptions,
  useConnectionState,
  useParticipants,
  useRoomContext,
  useVoiceAssistant,
} from '@livekit/components-react';
import { ParticipantKind } from 'livekit-client';
import WaveformAnimation from './WaveformAnimation';
import TranscriptBox from './TranscriptBox';
import CallButton from './CallButton';
import { processTranscriptSegments, getAgentState } from './TranscriptSegmentProcessor';

// Standalone version (when not in LiveKitRoom)
export function MainInterfaceStandalone({ onStartCall, onDisconnect, isConnecting, error }) {
  return (
    <div
      role="main"
      aria-label="Voice assistant interface"
      style={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Transcript Box - Top (hidden until call starts) */}
      <TranscriptBox 
        segments={[]}
        connectionState="disconnected"
      />

      {/* Waveform Animation - Middle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        flex: '0 0 auto',
        minHeight: '120px'
      }}>
        <WaveformAnimation 
          isActive={false} 
          isUserSpeaking={false} 
          isAgentSpeaking={false} 
          isConnected={false}
        />
      </div>

      {/* Microphone Button - Bottom */}
      <CallButton
        type="start"
        onClick={onStartCall}
        disabled={isConnecting}
        isConnecting={isConnecting}
        error={error}
      />
    </div>
  );
}

// Connected version (when in LiveKitRoom)
export default function MainInterface({ onDisconnect }) {
  const transcriptions = useTranscriptions();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const room = useRoomContext();
  const { state: voiceState } = useVoiceAssistant();
  
  // Memoize agent participant lookup
  const agentParticipant = useMemo(() => 
    participants.find(p => p.kind === ParticipantKind.AGENT),
    [participants]
  );
  
  const isAgentConnected = useMemo(() => 
    participants.some(p => p.kind === ParticipantKind.AGENT),
    [participants]
  );
  
  // Get agent state from participant attributes
  const agentState = useMemo(() => getAgentState(agentParticipant), [agentParticipant]);
  
  // Detect if user or agent is speaking
  const isUserSpeaking = voiceState === 'speaking';
  const isAgentSpeaking = agentState === 'speaking';
  const isActive = isUserSpeaking || isAgentSpeaking;
  
  // Process transcriptions into segments (memoized)
  const segments = useMemo(() => processTranscriptSegments(transcriptions), [transcriptions]);

  // Memoize disconnect handler
  const handleDisconnect = useCallback(() => {
    room?.disconnect();
    onDisconnect();
  }, [room, onDisconnect]);
  
  // Memoize agent ready state
  const isAgentReady = useMemo(() => 
    isAgentConnected && !isAgentSpeaking && !isUserSpeaking,
    [isAgentConnected, isAgentSpeaking, isUserSpeaking]
  );

  return (
    <div
      role="main"
      aria-label="Voice assistant interface"
      style={{ 
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Transcript Box - Top */}
      <TranscriptBox 
        segments={segments}
        connectionState={connectionState}
      />

      {/* Waveform Animation - Middle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        flex: '0 0 auto',
        minHeight: '120px'
      }}>
        <WaveformAnimation 
          isActive={isActive} 
          isUserSpeaking={isUserSpeaking} 
          isAgentSpeaking={isAgentSpeaking}
          isConnected={connectionState === 'connected'}
          isAgentReady={isAgentReady}
        />
      </div>

      {/* End Call Button - Bottom */}
      <CallButton
        type="end"
        onClick={handleDisconnect}
      />
    </div>
  );
}
