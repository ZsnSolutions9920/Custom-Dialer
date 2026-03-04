import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useCall } from './CallContext';
import { useToast } from './ToastContext';
import { getNextDialableEntry, getPowerDialProgress, updateEntryStatus, markEntryCalled } from '../api/phoneLists';

const PowerDialerContext = createContext(null);

const WRAP_UP_SECONDS = 15;
const SKIPPED_KEY = (lid) => `power_dialer_skipped_${lid}`;
const MIN_ID_KEY = (lid) => `power_dialer_minId_${lid}`;

export function PowerDialerProvider({ children }) {
  const { callState, makeCall, hangup, deviceReady } = useCall();
  const toast = useToast();

  const [phase, setPhase] = useState('idle'); // idle, dialing, wrap_up, paused
  const [listId, setListId] = useState(null);
  const [listName, setListName] = useState('');
  const [currentEntry, setCurrentEntry] = useState(null);
  const [skippedIds, setSkippedIds] = useState([]);
  const [progress, setProgress] = useState({ total: 0, dialed: 0, remaining: 0 });
  const [wrapUpTimer, setWrapUpTimer] = useState(WRAP_UP_SECONDS);
  const [timerPaused, setTimerPaused] = useState(false);
  const [statusUpdateCount, setStatusUpdateCount] = useState(0);
<<<<<<< HEAD
  const [dialingNext, setDialingNext] = useState(false);
=======
>>>>>>> 5df22b2f3c022679ccaeb925cbfb97d2ba6d1488
  const [startFromId, setStartFromId] = useState(null);

  const prevCallStateRef = useRef(callState);
  const sessionActiveRef = useRef(false);
  const wrapUpIntervalRef = useRef(null);
  const phaseRef = useRef(phase);
  const timerPausedRef = useRef(false);
  const dialingNextRef = useRef(false); // guard: true while transitioning between calls
  const startFromIdRef = useRef(null);

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
  const dialNext = useCallback(async (lid, skip, minId = null) => {
    dialingNextRef.current = true;
    setDialingNext(true);
    try {
<<<<<<< HEAD
      const entry = await getNextDialableEntry(lid, skip, minId);
=======
      const entry = await getNextDialableEntry(lid, skip, startFromIdRef.current);
>>>>>>> 5df22b2f3c022679ccaeb925cbfb97d2ba6d1488
      if (!entry) {
        // List exhausted — clean up persisted skips and minId
        localStorage.removeItem(SKIPPED_KEY(lid));
        localStorage.removeItem(MIN_ID_KEY(lid));
        setStartFromId(null);
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
      // Disconnect previous call before dialing next
      await hangup();
      await new Promise((r) => setTimeout(r, 500));
      // Release the transition guard before dialing so that
      // call-end detection works immediately if the call fails
      dialingNextRef.current = false;
      setDialingNext(false);
      makeCall(entry.phone_number);
      markEntryCalled(entry.id).catch((err) =>
        console.error('Failed to mark entry as called:', err)
      );
    } catch (err) {
      console.error('Power dialer: failed to dial next:', err);
      toast.error('Failed to dial next lead');
      setPhase('idle');
      setListId(null);
      setListName('');
      setCurrentEntry(null);
      setSkippedIds([]);
    } finally {
      dialingNextRef.current = false;
      setDialingNext(false);
    }
  }, [makeCall, hangup, refreshProgress, toast]);

  // Start a power dial session
  const startSession = useCallback(async (lid, name, startFromEntryId = null) => {
    if (!deviceReady) {
      toast.error('Phone device not ready. Please click anywhere on the page first.');
      return;
    }
    if (sessionActiveRef.current) {
      toast.error('A power dial session is already running');
      return;
    }
    let saved;
    let minId;
    if (startFromEntryId) {
      // Starting from a specific entry — clear old skip list
      saved = [];
      minId = startFromEntryId;
      localStorage.setItem(SKIPPED_KEY(lid), '[]');
      localStorage.setItem(MIN_ID_KEY(lid), String(minId));
    } else {
      // Normal start / resume — load existing state
      saved = JSON.parse(localStorage.getItem(SKIPPED_KEY(lid)) || '[]');
      const savedMinId = localStorage.getItem(MIN_ID_KEY(lid));
      minId = savedMinId ? parseInt(savedMinId, 10) : null;
    }
    setStartFromId(minId);
    setListId(lid);
    setListName(name);
    setSkippedIds(saved);
    setStartFromId(null);
    startFromIdRef.current = null;
    setPhase('dialing');
    await dialNext(lid, saved, minId);
  }, [deviceReady, dialNext, toast]);

  // Start a power dial session from a specific entry
  const startSessionFromEntry = useCallback(async (lid, name, entryId) => {
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
    setStartFromId(entryId);
    startFromIdRef.current = entryId;
    localStorage.removeItem(SKIPPED_KEY(lid));
    setPhase('dialing');
    await dialNext(lid, []);
  }, [deviceReady, dialNext, toast]);

  // Stop the session
  const stopSession = useCallback(() => {
<<<<<<< HEAD
    if (listId) {
      localStorage.removeItem(MIN_ID_KEY(listId));
    }
    setStartFromId(null);
=======
    hangup();
>>>>>>> 5df22b2f3c022679ccaeb925cbfb97d2ba6d1488
    setPhase('idle');
    setListId(null);
    setListName('');
    setCurrentEntry(null);
    setSkippedIds([]);
    setStartFromId(null);
    startFromIdRef.current = null;
    if (wrapUpIntervalRef.current) {
      clearInterval(wrapUpIntervalRef.current);
      wrapUpIntervalRef.current = null;
    }
<<<<<<< HEAD
  }, [listId]);
=======
  }, [hangup]);
>>>>>>> 5df22b2f3c022679ccaeb925cbfb97d2ba6d1488

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
      setStatusUpdateCount((c) => c + 1);
    } catch (err) {
      console.error('Failed to update entry status:', err);
    }
    // Always exclude current entry so we never re-dial the same person
    const nextSkip = skippedIds.includes(currentEntry.id) ? skippedIds : [...skippedIds, currentEntry.id];
    setSkippedIds(nextSkip);
    localStorage.setItem(SKIPPED_KEY(listId), JSON.stringify(nextSkip));
    await dialNext(listId, nextSkip, startFromId);
  }, [currentEntry, listId, skippedIds, startFromId, dialNext]);

  // Recall the current entry — redial the same number
  const recallEntry = useCallback(async () => {
    if (!currentEntry) return;
    if (wrapUpIntervalRef.current) {
      clearInterval(wrapUpIntervalRef.current);
      wrapUpIntervalRef.current = null;
    }
    setTimerPaused(false);
    timerPausedRef.current = false;
    setPhase('dialing');
    await hangup();
    await new Promise((r) => setTimeout(r, 500));
    makeCall(currentEntry.phone_number);
  }, [currentEntry, hangup, makeCall]);

  // Skip current entry — hangs up and enters wrap-up for disposition
  const skipEntry = useCallback(async () => {
    if (!currentEntry) return;
    // Set phase ref synchronously so call-end detection doesn't double-trigger
    phaseRef.current = 'wrap_up';
    setPhase('wrap_up');
    setWrapUpTimer(WRAP_UP_SECONDS);
    await hangup();
  }, [currentEntry, hangup]);

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

  // Detect call end (or call that never started): enter wrap-up when
  // callState is idle, we're in the dialing phase, and the transition
  // guard has been released. This also covers the case where makeCall
  // returned early (e.g. device not ready) and callState never left idle.
  useEffect(() => {
    prevCallStateRef.current = callState;

    if (callState === 'idle' && !dialingNext && sessionActiveRef.current && phaseRef.current === 'dialing') {
      setPhase('wrap_up');
      setWrapUpTimer(WRAP_UP_SECONDS);
    }
  }, [callState, dialingNext]);

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
        startSessionFromEntry,
        stopSession,
        submitStatus,
        skipEntry,
        recallEntry,
        pauseSession,
        resumeSession,
        pauseTimer,
        resumeTimer,
        statusUpdateCount,
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
