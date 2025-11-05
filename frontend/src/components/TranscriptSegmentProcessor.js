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

export function getAgentState(agentParticipant) {
  let agentState = 'listening';
  if (agentParticipant && agentParticipant.attributes) {
    try {
      if (typeof agentParticipant.attributes.get === 'function') {
        agentState = agentParticipant.attributes.get('lk.agent.state') || 'listening';
      }
      else if (agentParticipant.attributes['lk.agent.state']) {
        agentState = agentParticipant.attributes['lk.agent.state'];
      }
      else if (typeof agentParticipant.attributes === 'string') {
        const attrs = JSON.parse(agentParticipant.attributes);
        agentState = attrs['lk.agent.state'] || 'listening';
      }
    } catch (e) {
      agentState = 'listening';
    }
  }
  return agentState;
}

