import React from 'react';
import { LiveKitRoom, RoomAudioRenderer } from '@livekit/components-react';
import MainInterface from './MainInterface';
import { MainInterfaceStandalone } from './MainInterface';
import { LIVEKIT_URL } from '../utils/config';

export default function UnifiedUI({ onStartCall, onDisconnect, isConnecting, error, token }) {
  // If we have a token, wrap in LiveKitRoom
  if (token) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={LIVEKIT_URL}
        connect={true}
        audio={true}
        video={false}
        options={{
          adaptiveStream: true,
          dynacast: true,
          disconnectTimeout: 10000,
        }}
        onDisconnected={(reason) => {
          console.log('Disconnected from room:', reason);
          if (reason !== 'REJOIN') {
            onDisconnect();
          }
        }}
        onError={(error) => {
          const errorMessage = error?.message || '';
          const isRecoverableError = 
            errorMessage.includes('signal connection') ||
            errorMessage.includes('websocket') ||
            errorMessage.includes('retrying');
          
          if (!isRecoverableError) {
            console.error('Room error:', error);
            onDisconnect();
          } else {
            console.log('Recoverable connection error (retrying):', errorMessage);
          }
        }}
        onConnected={() => {
          console.log('Connected to room');
        }}
      >
        <MainInterface onDisconnect={onDisconnect} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    );
  }

  // Otherwise show the standalone version
  return (
    <MainInterfaceStandalone 
      onStartCall={onStartCall}
      onDisconnect={onDisconnect}
      isConnecting={isConnecting}
      error={error}
    />
  );
}
