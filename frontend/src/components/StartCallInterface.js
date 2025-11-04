import React from 'react';

export default function StartCallInterface({ onStartCall, isConnecting, error }) {
  return (
    <div style={{ 
      padding: '40px', 
      maxWidth: '900px', 
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '48px', margin: '0' }}>🔥</h1>
        <h1 style={{ margin: '10px 0' }}>Goggins Accountability Agent</h1>
        <p style={{ color: '#666', margin: '0' }}>Stay hard. No excuses.</p>
        <p style={{ fontSize: '14px', color: '#999', marginTop: '10px' }}>
          Powered by RAG over "Can't Hurt Me"
        </p>
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

      {/* Start Call Button */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <button 
          onClick={onStartCall} 
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
      </div>

      {/* What to try */}
      <div style={{ 
        padding: '20px',
        backgroundColor: '#fff',
        borderRadius: '8px',
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

