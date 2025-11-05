export default function CallButton({ 
  type, // 'start' or 'end'
  onClick, 
  disabled, 
  isConnecting,
  error 
}) {
  if (type === 'start') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        position: 'relative'
      }}>
        {error && (
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 16px',
            backgroundColor: 'rgba(244, 67, 54, 0.9)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            zIndex: 10
          }}>
            {error}
          </div>
        )}
        <button
          onClick={onClick}
          disabled={disabled || isConnecting}
          aria-label={isConnecting ? 'Connecting...' : 'Start call'}
          aria-busy={isConnecting}
          type="button"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!disabled && !isConnecting) {
                onClick();
              }
            }
          }}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: isConnecting ? '#cccccc' : '#000000',
            color: isConnecting ? '#000000' : '#ffffff',
            border: 'none',
            cursor: isConnecting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: isConnecting ? '0 4px 20px rgba(204, 204, 204, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease',
            opacity: isConnecting ? 0.7 : 1,
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.outline = '2px solid #000000';
            e.target.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.target.style.outline = 'none';
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>
    );
  }

  // End call button
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '40px 20px',
      position: 'relative'
    }}>
      <button
        onClick={onClick}
        aria-label="End call"
        type="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 4px 20px rgba(244, 67, 54, 0.4)',
          transition: 'all 0.3s ease',
          outline: 'none'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 25px rgba(244, 67, 54, 0.6)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(244, 67, 54, 0.4)';
        }}
        onFocus={(e) => {
          e.target.style.outline = '2px solid #f44336';
          e.target.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.target.style.outline = 'none';
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

