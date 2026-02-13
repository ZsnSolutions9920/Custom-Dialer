import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useCall } from './CallContext';
import { useToast } from './ToastContext';
import { getNextDialableEntry, getPowerDialProgress, updateEntryStatus, markEntryCalled } from '../api/phoneLists';

const PowerDialerContext = createContext(null);

const WRAP_UP_SECONDS = 15;

export function PowerDialerProvider({ children }) {
  const { callState, makeCall, deviceReady } = useCall();
  const toast = useToast();

  const [phase, setPhase] = useState('idle'); // idle, dialing, wrap_up, paused
  const [listId, setListId] = useState(null);
  const [listName, setListName] = useState('');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [skippedIds, setSkippedIds] = useState([]);
  const [progress, setProgress] = useState({ total: 0, dialed: 0, remaining: 0 });
  const [wrapUpTimer, setWrapUpTimer] = useState(WRAP_UP_SECONDS);
  const [timerPaused, setTimerPaused] = useState(false);

  const prevCallStateRef = useRef(callState);
  const sessionActiveRef = useRef(false);
  const wrapUpIntervalRef = useRef(null);
  const phaseRef = useRef(phase);
  const timerPausedRef = useRef(false);

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Keep sessionActiveRef in sync
  useEffect(() => {
    sessionActiveRef.current = phase !== 'idle';
  }, [phase]);

  const isActive = phase !== 'idle';

  // Fetch progress stats
  const refreshProgress = useCallback(async (lid) => {
    try {
      const p = await getPowerDialProgress(lid);
      setProgress(p);
    } catch (err) {
      console.error('Failed to fetch power dial progress:', err);
    }
  }, []);

  // Dial the next entry
  const dialNext = useCallback(async (lid, skip) => {
    try {
      const entry = await getNextDialableEntry(lid, skip);
      if (!entry) {
        // List exhausted
        setPhase('idle');
        setListId(null);
        setListName('');
        setCurrentEntry(null);
        setSkippedIds([]);
        toast.success('Power Dial complete — all leads dialed!');
        return;
      }
      setCurrentEntry(entry);
      setPhase('dialing');
      await refreshProgress(lid);
      makeCall(entry.phone_number);
      await markEntryCalled(entry.id);
    } catch (err) {
      console.error('Power dialer: failed to dial next:', err);
      toast.error('Failed to dial next lead');
      setPhase('idle');
      setListId(null);
      setListName('');
      setCurrentEntry(null);
      setSkippedIds([]);
    }
  }, [makeCall, refreshProgress, toast]);

  // Start a power dial session
  const startSession = useCallback(async (lid, name) => {
    if (!deviceReady) {
      toast.error('Phone device not ready. Please click anywhere on the page first.');
      return;
    }
    if (sessionActiveRef.current) {
      toast.error('A power dial session is already running');
      return;
    }
    setListId(lid);
    setListName(name);
    setSkippedIds([]);
    setPhase('dialing');
    await dialNext(lid, []);
  }, [deviceReady, dialNext, toast]);

  // Stop the session
  const stopSession = useCallback(() => {
    setPhase('idle');
    setListId(null);
    setListName('');
    setCurrentEntry(null);
    setSkippedIds([]);
    if (wrapUpIntervalRef.current) {
      clearInterval(wrapUpIntervalRef.current);
      wrapUpIntervalRef.current = null;
    }
  }, []);

  // Submit a status during wrap-up and dial next
  const submitStatus = useCallback(async (status, followUpAt = null) => {
    if (!currentEntry || !listId) return;
    if (wrapUpIntervalRef.current) {
      clearInterval(wrapUpIntervalRef.current);
      wrapUpIntervalRef.current = null;
    }
    setTimerPaused(false);
    timerPausedRef.current = false;
    try {
      await updateEntryStatus(currentEntry.id, status, followUpAt);
    } catch (err) {
      console.error('Failed to update entry status:', err);
    }
    // Dial next
    await dialNext(listId, skippedIds);
  }, [currentEntry, listId, skippedIds, dialNext]);

  // Skip current entry
  const skipEntry = useCallback(async () => {
    if (!currentEntry || !listId) return;
    if (wrapUpIntervalRef.current) {
      clearInterval(wrapUpIntervalRef.current);
      wrapUpIntervalRef.current = null;
    }
    const newSkipped = [...skippedIds, currentEntry.id];
    setSkippedIds(newSkipped);
    await dialNext(listId, newSkipped);
  }, [currentEntry, listId, skippedIds, dialNext]);

  // Pause the wrap-up timer (keeps phase as wrap_up, just freezes countdown)
  const pauseTimer = useCallback(() => {
    setTimerPaused(true);
    timerPausedRef.current = true;
  }, []);

  // Resume the wrap-up timer
  const resumeTimer = useCallback(() => {
    setTimerPaused(false);
    timerPausedRef.current = false;
  }, []);

  // Pause session (manual pause button)
  const pauseSession = useCallback(() => {
    if (phase === 'wrap_up' || phase === 'dialing') {
      if (wrapUpIntervalRef.current) {
        clearInterval(wrapUpIntervalRef.current);
        wrapUpIntervalRef.current = null;
      }
      setTimerPaused(false);
      timerPausedRef.current = false;
      setPhase('paused');
    }
  }, [phase]);

  // Resume session
  const resumeSession = useCallback(() => {
    if (phase === 'paused') {
      setPhase('wrap_up');
    }
  }, [phase]);

  // Detect call end: callState transition from non-idle to idle
  useEffect(() => {
    const prev = prevCallStateRef.current;
    prevCallStateRef.current = callState;

    if (prev !== 'idle' && callState === 'idle' && sessionActiveRef.current && phaseRef.current === 'dialing') {
      // Call ended, enter wrap-up
      setPhase('wrap_up');
      setWrapUpTimer(WRAP_UP_SECONDS);
    }
  }, [callState]);

  // Wrap-up countdown (respects timerPausedRef)
  useEffect(() => {
    if (phase === 'wrap_up') {
      setWrapUpTimer(WRAP_UP_SECONDS);
      wrapUpIntervalRef.current = setInterval(() => {
        if (timerPausedRef.current) return; // skip tick while paused
        setWrapUpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(wrapUpIntervalRef.current);
            wrapUpIntervalRef.current = null;
            submitStatus('called');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (wrapUpIntervalRef.current) {
        clearInterval(wrapUpIntervalRef.current);
        wrapUpIntervalRef.current = null;
      }
    }

    return () => {
      if (wrapUpIntervalRef.current) {
        clearInterval(wrapUpIntervalRef.current);
        wrapUpIntervalRef.current = null;
      }
    };
  }, [phase, submitStatus]);

  return (
    <PowerDialerContext.Provider
      value={{
        phase,
        isActive,
        listId,
        listName,
        currentEntry,
        progress,
        wrapUpTimer,
        timerPaused,
        startSession,
        stopSession,
        submitStatus,
        skipEntry,
        pauseSession,
        resumeSession,
        pauseTimer,
        resumeTimer,
      }}
    >
      {children}
    </PowerDialerContext.Provider>
  );
}

export function usePowerDialer() {
  const context = useContext(PowerDialerContext);
  if (!context) throw new Error('usePowerDialer must be used within PowerDialerProvider');
  return context;
}
