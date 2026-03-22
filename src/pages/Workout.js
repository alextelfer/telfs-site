import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';

const WORKOUT_SELECT_FIELDS =
  'id, created_at, program, week, day, exercise, set_number, reps, weight, timer_seconds';
const WORKOUT_OPTION_FIELDS = 'program, week, day, exercise, created_at';
const ADD_NEW_OPTION = '__add_new__';

const panelStyle = {
  background: '#c0c0c0',
  border: '2px solid',
  borderColor: '#fff #000 #000 #fff',
  boxShadow: 'inset 1px 1px 0 #dfdfdf, inset -1px -1px 0 #808080',
  padding: '12px'
};

const inputStyle = {
  width: '100%',
  padding: '6px',
  border: '2px solid',
  borderColor: '#808080 #fff #fff #808080',
  borderRadius: 0,
  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif'
};

const buttonStyle = {
  padding: '6px 12px',
  background: '#c0c0c0',
  border: '2px solid',
  borderColor: '#fff #000 #000 #fff',
  borderRadius: 0,
  color: '#000',
  cursor: 'pointer',
  fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif'
};

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const normalizeWorkoutValue = (value) => String(value || '').trim();

const workoutValueMatches = (left, right) =>
  normalizeWorkoutValue(left).toLowerCase() === normalizeWorkoutValue(right).toLowerCase();

const findLatestRow = (rows, predicate) => rows.find((row) => predicate(row));

const buildWorkoutOptions = (values, currentValue) => {
  const optionSet = new Set();

  values.forEach((value) => {
    const normalized = normalizeWorkoutValue(value);
    if (normalized) {
      optionSet.add(normalized);
    }
  });

  const normalizedCurrent = normalizeWorkoutValue(currentValue);
  if (normalizedCurrent) {
    optionSet.add(normalizedCurrent);
  }

  return Array.from(optionSet).sort((a, b) =>
    a.localeCompare(b, undefined, {
      numeric: true,
      sensitivity: 'base'
    })
  );
};

const mapWorkoutRow = (row) => {
  const createdAt = row.created_at ? new Date(row.created_at) : new Date();

  return {
    id: row.id,
    timestamp: createdAt.getTime(),
    dateLabel: createdAt.toLocaleString(),
    program: row.program,
    week: row.week,
    day: row.day,
    exercise: row.exercise,
    setNumber: row.set_number,
    reps: row.reps,
    weight: Number(row.weight || 0),
    timerSeconds: row.timer_seconds || 0
  };
};

function Workout() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const previousTimerRunningRef = useRef(false);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [optionRows, setOptionRows] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [program, setProgram] = useState('');
  const [week, setWeek] = useState('');
  const [day, setDay] = useState('');
  const [exercise, setExercise] = useState('');
  const [addingProgram, setAddingProgram] = useState(false);
  const [addingWeek, setAddingWeek] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [setNumber, setSetNumber] = useState('1');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [timerDuration, setTimerDuration] = useState('3');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [initialSelectionSet, setInitialSelectionSet] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (!mounted) {
          return;
        }

        if (error || !data?.user) {
          navigate('/piracy', { replace: true });
          setUser(null);
          return;
        }

        setUser(data.user);
      } catch (error) {
        console.error('Failed to verify workout auth:', error);
        if (mounted) {
          navigate('/piracy', { replace: true });
          setUser(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (session?.user) {
      setUser(session.user);
      setAuthLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    let mounted = true;

    const fetchWorkoutOptions = async () => {
      const { data, error } = await supabase
        .from('workout_logs')
        .select(WORKOUT_OPTION_FIELDS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!mounted) {
        return;
      }

      if (error) {
        console.error('Failed to fetch workout dropdown options:', error);
        return;
      }

      setOptionRows(data || []);
    };

    fetchWorkoutOptions();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (initialSelectionSet || optionRows.length === 0) {
      return;
    }

    const latest = optionRows[0];
    const latestProgram = normalizeWorkoutValue(latest?.program);
    const latestWeek = normalizeWorkoutValue(latest?.week);
    const latestDay = normalizeWorkoutValue(latest?.day);
    const latestExercise = normalizeWorkoutValue(latest?.exercise);

    setProgram(latestProgram);
    setWeek(latestWeek);
    setDay(latestDay);
    setExercise(latestExercise);
    setAddingProgram(false);
    setAddingWeek(false);
    setAddingDay(false);
    setAddingExercise(false);
    setInitialSelectionSet(true);
  }, [optionRows, initialSelectionSet]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const trimmedProgram = program.trim();
    const trimmedWeek = week.trim();
    const trimmedDay = day.trim();

    if (!trimmedProgram || !trimmedWeek || !trimmedDay) {
      setLogs([]);
      return undefined;
    }

    let mounted = true;

    const fetchWorkoutLogs = async () => {
      setLogsLoading(true);
      setLoadError('');

      const { data, error } = await supabase
        .from('workout_logs')
        .select(WORKOUT_SELECT_FIELDS)
        .eq('user_id', user.id)
        .eq('program', trimmedProgram)
        .eq('week', trimmedWeek)
        .eq('day', trimmedDay)
        .order('created_at', { ascending: false })
        .limit(250);

      if (!mounted) {
        return;
      }

      if (error) {
        console.error('Failed to fetch workout logs:', error);
        setLoadError('failed to load saved workout sets');
        setLogs([]);
      } else {
        setLogs((data || []).map(mapWorkoutRow));
      }

      setLogsLoading(false);
    };

    fetchWorkoutLogs();

    return () => {
      mounted = false;
    };
  }, [user?.id, program, week, day]);

  useEffect(() => {
    if (!timerRunning) {
      return undefined;
    }

    const interval = setInterval(() => {
      setTimerSeconds((current) => {
        if (current <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (previousTimerRunningRef.current && !timerRunning && timerSeconds === 0) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const audioContext = new AudioContextClass();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
          oscillator.onended = () => {
            audioContext.close().catch(() => undefined);
          };
        }
      } catch (error) {
        console.error('Failed to play timer end sound:', error);
      }
    }

    previousTimerRunningRef.current = timerRunning;
  }, [timerRunning, timerSeconds]);

  const programOptions = useMemo(
    () => buildWorkoutOptions(optionRows.map((row) => row.program), program),
    [optionRows, program]
  );

  const weekOptions = useMemo(() => {
    const filteredRows = optionRows.filter((row) => workoutValueMatches(row.program, program));
    return buildWorkoutOptions(
      filteredRows.map((row) => row.week),
      week
    );
  }, [optionRows, program, week]);

  const dayOptions = useMemo(() => {
    const filteredRows = optionRows.filter(
      (row) => workoutValueMatches(row.program, program) && workoutValueMatches(row.week, week)
    );

    return buildWorkoutOptions(
      filteredRows.map((row) => row.day),
      day
    );
  }, [optionRows, program, week, day]);

  const exerciseOptions = useMemo(() => {
    const filteredRows = optionRows.filter(
      (row) =>
        workoutValueMatches(row.program, program) &&
        workoutValueMatches(row.week, week) &&
        workoutValueMatches(row.day, day)
    );

    return buildWorkoutOptions(
      filteredRows.map((row) => row.exercise),
      exercise
    );
  }, [optionRows, program, week, day, exercise]);

  const suggestion = useMemo(() => {
    const normalizedExercise = exercise.trim().toLowerCase();
    if (!program.trim() || !week.trim() || !day.trim() || !normalizedExercise || !setNumber.trim()) {
      return null;
    }

    return logs.find(
      (entry) =>
        entry.program === program.trim() &&
        entry.week === week.trim() &&
        entry.day === day.trim() &&
        entry.exercise.toLowerCase() === normalizedExercise &&
        String(entry.setNumber) === setNumber.trim()
    );
  }, [logs, program, week, day, exercise, setNumber]);

  const currentDayLogs = useMemo(() => {
    const filtered = logs.filter(
      (entry) => entry.program === program.trim() && entry.week === week.trim() && entry.day === day.trim()
    );
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [logs, program, week, day]);

  const applySuggestion = () => {
    if (!suggestion) {
      return;
    }
    setReps(String(suggestion.reps));
    setWeight(String(suggestion.weight || ''));
  };

  const createProgramOption = () => {
    const trimmedProgram = program.trim();

    if (!trimmedProgram) {
      setMessage('enter a program name first');
      return;
    }

    setOptionRows((previous) => [
      {
        program: trimmedProgram,
        week: '',
        day: '',
        exercise: '',
        created_at: new Date().toISOString()
      },
      ...previous
    ]);
    setProgram(trimmedProgram);
    setWeek('');
    setDay('');
    setExercise('');
    setAddingProgram(false);
    setMessage('program created');
  };

  const createWeekOption = () => {
    const trimmedProgram = program.trim();
    const trimmedWeek = week.trim();

    if (!trimmedProgram) {
      setMessage('choose or create a program first');
      return;
    }

    if (!trimmedWeek) {
      setMessage('enter a week name first');
      return;
    }

    setOptionRows((previous) => [
      {
        program: trimmedProgram,
        week: trimmedWeek,
        day: '',
        exercise: '',
        created_at: new Date().toISOString()
      },
      ...previous
    ]);
    setWeek(trimmedWeek);
    setDay('');
    setExercise('');
    setAddingWeek(false);
    setMessage('week created');
  };

  const createDayOption = () => {
    const trimmedProgram = program.trim();
    const trimmedWeek = week.trim();
    const trimmedDay = day.trim();

    if (!trimmedProgram || !trimmedWeek) {
      setMessage('choose or create program and week first');
      return;
    }

    if (!trimmedDay) {
      setMessage('enter a day name first');
      return;
    }

    setOptionRows((previous) => [
      {
        program: trimmedProgram,
        week: trimmedWeek,
        day: trimmedDay,
        exercise: '',
        created_at: new Date().toISOString()
      },
      ...previous
    ]);
    setDay(trimmedDay);
    setExercise('');
    setAddingDay(false);
    setMessage('day created');
  };

  const startTimer = () => {
    const durationMinutes = Number(timerDuration);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setMessage('set duration to a valid number (minutes)');
      return;
    }
    setTimerSeconds(durationMinutes * 60);
    setTimerRunning(true);
  };

  const logSet = async () => {
    if (!user?.id) {
      setMessage('you need to be logged in to save sets');
      return;
    }

    if (!program.trim() || !week.trim() || !day.trim() || !exercise.trim() || !reps.trim()) {
      setMessage('fill in program, week, day, exercise, and reps');
      return;
    }

    const parsedSet = Number(setNumber);
    const parsedReps = Number(reps);
    const parsedWeight = Number(weight || 0);

    if (!Number.isFinite(parsedSet) || parsedSet <= 0 || !Number.isFinite(parsedReps) || parsedReps <= 0) {
      setMessage('set and reps must be valid numbers');
      return;
    }

    const trimmedProgram = program.trim();
    const trimmedWeek = week.trim();
    const trimmedDay = day.trim();
    const trimmedExercise = exercise.trim();

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert([
          {
            user_id: user.id,
            program: trimmedProgram,
            week: trimmedWeek,
            day: trimmedDay,
            exercise: trimmedExercise,
            set_number: parsedSet,
            reps: parsedReps,
            weight: Number.isFinite(parsedWeight) ? parsedWeight : 0,
            timer_seconds: timerSeconds
          }
        ])
        .select(WORKOUT_SELECT_FIELDS)
        .single();

      if (error || !data) {
        console.error('Failed to save workout set:', error);
        setMessage('failed to save set. please try again.');
        return;
      }

      const entry = mapWorkoutRow(data);
      setLogs((previous) => [entry, ...previous]);
      setOptionRows((previous) => [
        {
          program: data.program,
          week: data.week,
          day: data.day,
          exercise: data.exercise,
          created_at: data.created_at
        },
        ...previous
      ]);
      setSetNumber(String(parsedSet + 1));
      setReps('');
      setWeight('');
      setMessage('set saved');
      window.dispatchEvent(
        new CustomEvent('workout-updated', {
          detail: {
            userId: user.id,
            program: entry.program,
            week: entry.week,
            day: entry.day
          }
        })
      );
    } catch (error) {
      console.error('Unexpected workout save error:', error);
      setMessage('failed to save set. please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#008080',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif',
          color: '#fff'
        }}
      >
        checking login...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#008080',
        padding: '16px',
        fontFamily: 'MS Sans Serif, Microsoft Sans Serif, Arial, sans-serif'
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gap: '12px' }}>
        <div style={{ ...panelStyle, background: '#000080', color: '#fff' }}>
          <h1 style={{ margin: 0, fontSize: '1rem' }}>workout tracker</h1>
          <div style={{ marginTop: '4px', fontSize: '0.8rem' }}>logged in as: {user.email || user.id}</div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>program</div>
              <select
                style={inputStyle}
                value={addingProgram ? ADD_NEW_OPTION : program}
                onChange={(e) => {
                  const selected = e.target.value;
                  if (selected === ADD_NEW_OPTION) {
                    setAddingProgram(true);
                    setProgram('');
                    setWeek('');
                    setDay('');
                    setExercise('');
                    return;
                  }

                  const latestProgramRow = findLatestRow(optionRows, (row) =>
                    workoutValueMatches(row.program, selected)
                  );
                  const latestWeekValue = normalizeWorkoutValue(latestProgramRow?.week);
                  const latestProgramWeekRow = findLatestRow(
                    optionRows,
                    (row) =>
                      workoutValueMatches(row.program, selected) &&
                      workoutValueMatches(row.week, latestWeekValue)
                  );
                  const latestDayValue = normalizeWorkoutValue(latestProgramWeekRow?.day);
                  const latestProgramWeekDayRow = findLatestRow(
                    optionRows,
                    (row) =>
                      workoutValueMatches(row.program, selected) &&
                      workoutValueMatches(row.week, latestWeekValue) &&
                      workoutValueMatches(row.day, latestDayValue)
                  );

                  setAddingProgram(false);
                  setAddingWeek(false);
                  setAddingDay(false);
                  setAddingExercise(false);
                  setProgram(selected);
                  setWeek(latestWeekValue);
                  setDay(latestDayValue);
                  setExercise(normalizeWorkoutValue(latestProgramWeekDayRow?.exercise));
                }}
              >
                {programOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={ADD_NEW_OPTION}>+ add new...</option>
              </select>
              {addingProgram && (
                <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                  <input
                    style={inputStyle}
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                    placeholder="new program"
                  />
                  <button style={buttonStyle} onClick={createProgramOption}>
                    create
                  </button>
                </div>
              )}
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>week</div>
              <select
                style={inputStyle}
                value={addingWeek ? ADD_NEW_OPTION : week}
                onChange={(e) => {
                  const selected = e.target.value;
                  if (selected === ADD_NEW_OPTION) {
                    setAddingWeek(true);
                    setWeek('');
                    setDay('');
                    setExercise('');
                    return;
                  }

                  const latestProgramWeekRow = findLatestRow(
                    optionRows,
                    (row) => workoutValueMatches(row.program, program) && workoutValueMatches(row.week, selected)
                  );
                  const latestDayValue = normalizeWorkoutValue(latestProgramWeekRow?.day);
                  const latestProgramWeekDayRow = findLatestRow(
                    optionRows,
                    (row) =>
                      workoutValueMatches(row.program, program) &&
                      workoutValueMatches(row.week, selected) &&
                      workoutValueMatches(row.day, latestDayValue)
                  );

                  setAddingWeek(false);
                  setAddingDay(false);
                  setAddingExercise(false);
                  setWeek(selected);
                  setDay(latestDayValue);
                  setExercise(normalizeWorkoutValue(latestProgramWeekDayRow?.exercise));
                }}
              >
                {weekOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={ADD_NEW_OPTION}>+ add new...</option>
              </select>
              {addingWeek && (
                <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                  <input
                    style={inputStyle}
                    value={week}
                    onChange={(e) => setWeek(e.target.value)}
                    placeholder="new week"
                  />
                  <button style={buttonStyle} onClick={createWeekOption}>
                    create
                  </button>
                </div>
              )}
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>day</div>
              <select
                style={inputStyle}
                value={addingDay ? ADD_NEW_OPTION : day}
                onChange={(e) => {
                  const selected = e.target.value;
                  if (selected === ADD_NEW_OPTION) {
                    setAddingDay(true);
                    setDay('');
                    setExercise('');
                    return;
                  }

                  const latestProgramWeekDayRow = findLatestRow(
                    optionRows,
                    (row) =>
                      workoutValueMatches(row.program, program) &&
                      workoutValueMatches(row.week, week) &&
                      workoutValueMatches(row.day, selected)
                  );

                  setAddingDay(false);
                  setAddingExercise(false);
                  setDay(selected);
                  setExercise(normalizeWorkoutValue(latestProgramWeekDayRow?.exercise));
                }}
              >
                {dayOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={ADD_NEW_OPTION}>+ add new...</option>
              </select>
              {addingDay && (
                <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                  <input
                    style={inputStyle}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    placeholder="new day"
                  />
                  <button style={buttonStyle} onClick={createDayOption}>
                    create
                  </button>
                </div>
              )}
            </label>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <strong style={{ minWidth: '62px' }}>countdown</strong>
            <div style={{ fontSize: '1.4rem', minWidth: '80px' }}>{formatTime(timerSeconds)}</div>
            {!timerRunning ? (
              <>
                <input
                  style={{ ...inputStyle, width: '60px', padding: '4px' }}
                  value={timerDuration}
                  onChange={(e) => setTimerDuration(e.target.value)}
                  placeholder="mins"
                />
                <button style={buttonStyle} onClick={startTimer}>
                  start
                </button>
              </>
            ) : (
              <button style={buttonStyle} onClick={() => setTimerRunning(false)}>
                pause
              </button>
            )}
            <button
              style={buttonStyle}
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(0);
              }}
            >
              reset
            </button>
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>exercise</div>
              <select
                style={inputStyle}
                value={addingExercise ? ADD_NEW_OPTION : exercise}
                onChange={(e) => {
                  const selected = e.target.value;
                  if (selected === ADD_NEW_OPTION) {
                    setAddingExercise(true);
                    setExercise('');
                    return;
                  }

                  setAddingExercise(false);
                  setExercise(selected);
                }}
              >
                {exerciseOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={ADD_NEW_OPTION}>+ add new...</option>
              </select>
              {addingExercise && (
                <input
                  style={{ ...inputStyle, marginTop: '6px' }}
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  placeholder="new exercise"
                />
              )}
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>set</div>
              <input
                style={{ ...inputStyle, width: '70%' }}
                type="number"
                min="1"
                step="1"
                value={setNumber}
                onChange={(e) => setSetNumber(e.target.value)}
              />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>reps</div>
              <input
                style={{ ...inputStyle, width: '70%' }}
                type="number"
                min="1"
                step="1"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>weight</div>
              <input
                style={{ ...inputStyle, width: '70%' }}
                type="number"
                min="0"
                step="0.01"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </label>
          </div>

          {suggestion && (
            <div style={{ marginTop: '8px', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>
                last time: {suggestion.weight || 0} x {suggestion.reps} reps on {suggestion.dateLabel}
              </span>
              <button style={{ ...buttonStyle, padding: '4px 8px' }} onClick={applySuggestion}>
                use last
              </button>
            </div>
          )}

          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button style={buttonStyle} onClick={logSet} disabled={saving}>
              {saving ? 'saving...' : 'save set'}
            </button>
            {message && (
              <span
                style={{
                  fontSize: '0.85rem',
                  color: message.startsWith('failed') ? '#c00' : '#006600',
                  fontWeight: message.startsWith('failed') ? 'bold' : 'normal'
                }}
              >
                {message}
              </span>
            )}
          </div>
        </div>

        <div style={panelStyle}>
          <h2 style={{ marginTop: 0, fontSize: '1rem' }}>this workout day</h2>
          {logsLoading && <div style={{ fontSize: '0.9rem', marginBottom: '6px' }}>loading saved sets...</div>}
          {loadError && <div style={{ fontSize: '0.9rem', marginBottom: '6px', color: '#c00', fontWeight: 'bold' }}>{loadError}</div>}
          {currentDayLogs.length === 0 ? (
            <div style={{ fontSize: '0.9rem' }}>no sets logged yet</div>
          ) : (
            <div style={{ display: 'grid', gap: '4px' }}>
              {currentDayLogs.slice(0, 25).map((entry) => (
                <div key={entry.id} style={{ fontSize: '0.9rem' }}>
                  {entry.exercise} - set {entry.setNumber}: {entry.weight || 0} x {entry.reps} reps ({entry.dateLabel})
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Workout;