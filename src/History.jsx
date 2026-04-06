import { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar } from 'lucide-react';

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

  // Helper function to group a flat array of sets into exercise blocks
  const groupSetsByExercise = (sets) => {
    const grouped = sets.reduce((acc, currentSet) => {
      const { exerciseName, muscleGroup } = currentSet;
      
      // If we haven't seen this exercise yet, create a new bucket for it
      if (!acc[exerciseName]) {
        acc[exerciseName] = {
          name: exerciseName,
          muscleGroup: muscleGroup,
          history: []
        };
      }
      
      // Toss the set into the bucket
      acc[exerciseName].history.push(currentSet);
      return acc;
    }, {});

    // Convert the buckets back into an array so React can map over it
    return Object.values(grouped);
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

      {sessions.map((session) => {
        // Group the sets for this specific session
        const exerciseGroups = groupSetsByExercise(session.sets);

        return (
          <div key={session.id} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg">
            {/* Header: Date */}
            <div className="bg-slate-900/50 p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-100">{formatDate(session.date)}</h3>
              <span className="text-xs text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">
                {session.sets.length} Sets
              </span>
            </div>

            {/* Body: The Grouped Exercises */}
            <div className="p-4 space-y-5">
              {exerciseGroups.length === 0 ? (
                <p className="text-slate-500 text-sm italic">Empty session.</p>
              ) : (
                exerciseGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="border-b border-slate-700/50 last:border-0 pb-4 last:pb-0">
                    
                    {/* Exercise Title */}
                    <div className="flex flex-col mb-3">
                      <span className="font-bold text-slate-200 text-lg">{group.name}</span>
                      <span className="text-xs text-slate-500">{group.muscleGroup}</span>
                    </div>
                    
                    {/* The Sequenced Sets */}
                    <div className="space-y-2 pl-3 border-l-2 border-slate-600/50">
                      {group.history.map((set, setIdx) => (
                        <div key={setIdx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-400 font-medium tracking-wide">
                            Set {setIdx + 1}
                          </span>
                          
                          <div className="text-right flex items-center">
                            <span className="font-bold text-emerald-400">
                              {set.weight > 0 ? `${set.weight} ${set.unit || 'lbs'} × ` : ''}{set.reps}
                            </span>
                            {set.isDropSet && (
                              <span className="ml-2 text-[9px] uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                                Drop
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}