import { useEffect, useRef, useMemo } from 'react';

export default function TranscriptBox({ segments, connectionState }) {
  const transcriptEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isConnected = connectionState === 'connected';
  const wasScrollingRef = useRef(false);
  
  // Memoize transcript text to avoid unnecessary recalculations
  const transcriptText = useMemo(() => {
    return segments
      .map(segment => segment.text)
      .filter(text => text.trim().length > 0)
      .join('\n');
  }, [segments]);
  
  // Handle auto-scroll with user scroll detection
  useEffect(() => {
    if (!transcriptEndRef.current || !scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const isUserScrolling = container.scrollHeight - container.scrollTop - container.clientHeight > 100;
    
    // Only auto-scroll if user hasn't manually scrolled up
    if (!isUserScrolling) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [segments.length]);
  
  // Track scroll position to detect user scrolling
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    wasScrollingRef.current = !isNearBottom;
  };

  return (
    <div style={{ 
      padding: '20px',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      flexShrink: 0,
      flex: '1 1 auto',
      overflow: 'visible',
      minHeight: '200px'
    }}>
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: '16px',
        padding: '20px',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        maxWidth: '550px',
        width: '100%',
        minWidth: '400px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        maxHeight: 'calc(100vh - 300px)'
      }}>
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          role="log"
          aria-live="polite"
          aria-label="Transcription"
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: 1,
            minHeight: 0,
            color: 'rgba(0, 0, 0, 0.9)',
            fontSize: '15px',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
            fontFamily: 'monospace',
            paddingRight: '8px'
          }}
        >
          {transcriptText || ''}
          {segments.length > 0 && segments[segments.length - 1] && !segments[segments.length - 1].final && (
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '2px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              marginLeft: '4px',
              animation: 'blink 1s infinite',
              verticalAlign: 'middle'
            }} />
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  );
}

