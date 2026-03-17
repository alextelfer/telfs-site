import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';

const WORKOUT_SELECT_FIELDS =
  'id, created_at, program, week, day, exercise, set_number, reps, weight, timer_seconds';

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

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [program, setProgram] = useState('main');
  const [week, setWeek] = useState('1');
  const [day, setDay] = useState('1');
  const [exercise, setExercise] = useState('');
  const [setNumber, setSetNumber] = useState('1');
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [timerDuration, setTimerDuration] = useState('3');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [message, setMessage] = useState('');

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
          <div style={{ marginTop: '6px', fontSize: '0.9rem' }}>
            {program || 'program'} {'>'} {week || 'week'} {'>'} {day || 'day'} {'>'} {exercise || 'exercise'} {'>'} set {setNumber || '1'} {'>'} rep
          </div>
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>program</div>
              <input style={inputStyle} value={program} onChange={(e) => setProgram(e.target.value)} />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>week</div>
              <input style={inputStyle} value={week} onChange={(e) => setWeek(e.target.value)} />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>day</div>
              <input style={inputStyle} value={day} onChange={(e) => setDay(e.target.value)} />
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
              <input style={inputStyle} value={exercise} onChange={(e) => setExercise(e.target.value)} />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>set</div>
              <input style={inputStyle} value={setNumber} onChange={(e) => setSetNumber(e.target.value)} />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>reps</div>
              <input style={inputStyle} value={reps} onChange={(e) => setReps(e.target.value)} />
            </label>
            <label>
              <div style={{ marginBottom: '4px', fontSize: '0.85rem' }}>weight</div>
              <input style={inputStyle} value={weight} onChange={(e) => setWeight(e.target.value)} />
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