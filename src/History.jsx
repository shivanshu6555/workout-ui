import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, ChevronRight } from 'lucide-react';

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/history')
      .then(response => {
        setSessions(response.data);
      })
      .catch(error => console.error("Error fetching history:", error))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <div className="text-emerald-400 text-center mt-20 animate-pulse font-bold">Loading History...</div>;
  }

  if (sessions.length === 0) {
    return <div className="text-slate-400 text-center mt-20 italic">No workouts logged yet. Get to the gym!</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-emerald-400 mb-6 flex items-center">
        <Calendar className="mr-2" /> Workout Log
      </h2>

      {sessions.map((session) => (
        <div key={session.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
          {/* Header: Date */}
          <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-slate-100">{formatDate(session.date)}</h3>
            <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
              {session.sets.length} Sets
            </span>
          </div>

          {/* Body: The Sets */}
          <div className="p-4 space-y-3">
            {session.sets.length === 0 ? (
              <p className="text-slate-500 text-sm italic">Empty session.</p>
            ) : (
              session.sets.map((set, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-slate-700/50 last:border-0 pb-2 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-200">{set.exerciseName}</span>
                    <span className="text-xs text-slate-500">{set.muscleGroup}</span>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-emerald-400">
                      {set.weight > 0 ? `${set.weight} ${set.unit || 'lbs'} × ` : ''}{set.reps}
                    </div>
                    {set.isDropSet && (
                      <span className="text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                        Drop Set
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}