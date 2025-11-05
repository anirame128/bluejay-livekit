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
      <TranscriptBox
        segments={[]}
        connectionState="disconnected"
      />

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

export default function MainInterface({ onDisconnect }) {
  const transcriptions = useTranscriptions();
  const connectionState = useConnectionState();
  const participants = useParticipants();
  const room = useRoomContext();
  const { state: voiceState } = useVoiceAssistant();

  const agentParticipant = useMemo(() =>
    participants.find(p => p.kind === ParticipantKind.AGENT),
    [participants]
  );

  const isAgentConnected = useMemo(() =>
    participants.some(p => p.kind === ParticipantKind.AGENT),
    [participants]
  );

  const agentState = useMemo(() => getAgentState(agentParticipant), [agentParticipant]);

  const isUserSpeaking = voiceState === 'speaking';
  const isAgentSpeaking = agentState === 'speaking';
  const isActive = isUserSpeaking || isAgentSpeaking;

  const segments = useMemo(() => processTranscriptSegments(transcriptions), [transcriptions]);

  const handleDisconnect = useCallback(() => {
    room?.disconnect();
    onDisconnect();
  }, [room, onDisconnect]);

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
      <TranscriptBox
        segments={segments}
        connectionState={connectionState}
      />

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

      <CallButton
        type="end"
        onClick={handleDisconnect}
      />
    </div>
  );
}
