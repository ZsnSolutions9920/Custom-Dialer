import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import * as agentsApi from '../api/agents';

export function useAgentPresence() {
  const { socket } = useSocket();
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    // Initial fetch
    agentsApi.getAgents().then(setAgents).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onAgentsList = (list) => setAgents(list);

    const onAgentStatus = (updated) => {
      setAgents((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
      );
    };

    socket.on('agents:list', onAgentsList);
    socket.on('agent:status', onAgentStatus);

    return () => {
      socket.off('agents:list', onAgentsList);
      socket.off('agent:status', onAgentStatus);
    };
  }, [socket]);

  const setStatus = useCallback(
    async (agentId, status) => {
      await agentsApi.updateStatus(agentId, status);
    },
    []
  );

  return { agents, setStatus };
}
