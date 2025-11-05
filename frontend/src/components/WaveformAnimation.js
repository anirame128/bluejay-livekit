import { useEffect, useState, useMemo } from 'react';

export default function WaveformAnimation({ isActive, isUserSpeaking, isAgentSpeaking, isConnected, isAgentReady }) {
  const numBars = 35;
  const [heights, setHeights] = useState(() => 
    Array.from({ length: numBars }, () => Math.random() * 10 + 5)
  );
  
  // Memoize bars array to avoid recreating on every render
  const bars = useMemo(() => Array.from({ length: numBars }, (_, i) => i), []);
  
  useEffect(() => {
    if (!isActive) {
      // Reset to low heights when not active
      setHeights(Array.from({ length: numBars }, () => Math.random() * 20 + 15));
      return;
    }
    
    const interval = setInterval(() => {
      setHeights(prev => prev.map(() => {
        const baseHeight = isUserSpeaking ? 100 : 80;
        const minHeight = isUserSpeaking ? 40 : 30;
        return Math.random() * baseHeight + minHeight;
      }));
    }, 100); // Update every 100ms for smooth animation
    
    return () => clearInterval(interval);
  }, [isActive, isUserSpeaking, isAgentSpeaking, numBars]);
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={isAgentReady ? 'Agent ready for input' : isActive ? (isUserSpeaking ? 'User speaking' : 'Agent speaking') : 'Inactive'}
      style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      height: '100px',
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 20px',
      animationName: isConnected && isAgentReady ? 'glowPulse' : 'none',
      animationDuration: isConnected && isAgentReady ? '2s' : 'none',
      animationTimingFunction: isConnected && isAgentReady ? 'ease-in-out' : 'none',
      animationIterationCount: isConnected && isAgentReady ? 'infinite' : 'none',
      flexShrink: 0
    }}>
      {bars.map((_, index) => {
        const delay = index * 0.05;
        const height = heights[index];
        const animationDuration = 0.6 + delay;
        
        return (
          <div
            key={index}
            style={{
              width: '8px',
              height: `${height * 2}px`,
              maxHeight: '100px',
              backgroundColor: isActive 
                ? '#000000'
                : '#cccccc',
              borderRadius: '4px',
              transition: 'height 0.1s ease',
              animationName: isActive ? 'wave' : 'none',
              animationDuration: isActive ? `${animationDuration}s` : 'none',
              animationTimingFunction: isActive ? 'ease-in-out' : 'none',
              animationIterationCount: isActive ? 'infinite' : 'none',
              animationDelay: isActive ? `${delay}s` : '0s'
            }}
          />
        );
      })}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.8); }
          50% { transform: scaleY(1.2); }
        }
        @keyframes glowPulse {
          0%, 100% { 
            filter: drop-shadow(0 0 15px rgba(0, 0, 0, 0.3));
          }
          50% { 
            filter: drop-shadow(0 0 25px rgba(0, 0, 0, 0.6));
          }
        }
      `}</style>
    </div>
  );
}

