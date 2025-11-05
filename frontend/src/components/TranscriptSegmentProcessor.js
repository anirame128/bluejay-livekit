/**
 * Processes transcriptions and extracts text segments
 */
export function processTranscriptSegments(transcriptions) {
  if (!Array.isArray(transcriptions)) {
    return [];
  }
  
  return transcriptions.map((transcription, index) => ({
    id: transcription.id || transcription.segmentId || `transcript-${index}`,
    text: transcription.text || transcription.message || '',
    final: transcription.final ?? transcription.isFinal ?? true,
  }));
}

/**
 * Gets agent state from participant attributes
 */
export function getAgentState(agentParticipant) {
  let agentState = 'listening';
  if (agentParticipant && agentParticipant.attributes) {
    try {
      // Try as Map first
      if (typeof agentParticipant.attributes.get === 'function') {
        agentState = agentParticipant.attributes.get('lk.agent.state') || 'listening';
      } 
      // Try as object property
      else if (agentParticipant.attributes['lk.agent.state']) {
        agentState = agentParticipant.attributes['lk.agent.state'];
      }
      // Try parsing if it's a string
      else if (typeof agentParticipant.attributes === 'string') {
        const attrs = JSON.parse(agentParticipant.attributes);
        agentState = attrs['lk.agent.state'] || 'listening';
      }
    } catch (e) {
      // Fallback to default - agent is likely listening
      console.debug('Could not read agent state:', e);
      agentState = 'listening';
    }
  }
  return agentState;
}

