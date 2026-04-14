import React, { useState, useEffect } from 'react';
import { Plus, Minus, Check, Copy, History, WifiOff, CloudUpload, Download, PlusCircle, X, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { saveOfflineSet, syncOfflineSets } from './syncManager';

export default function WorkoutLogger() {
  // Application State
  const [sessionId, setSessionId] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [previousSets, setPreviousSets] = useState([]);
  const [loggedSets, setLoggedSets] = useState([]);

  const [isEditingIncrement, setIsEditingIncrement] = useState(false);
  const [customIncrementVal, setCustomIncrementVal] = useState('');

  // Graph State
  const [showStats, setShowStats] = useState(false);
  const [chartData, setChartData] = useState([]);

  // Selections & Filters
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [unit, setUnit] = useState('lbs');

  // Form State
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [targetReps, setTargetReps] = useState(0);
  const [isDropSet, setIsDropSet] = useState(false);

  // Add Custom Exercise State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExIncrement, setNewExIncrement] = useState(5);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const muscleGroups = ['Back', 'Chest', 'Legs', 'Biceps', 'Triceps', 'Shoulders', 'Core'];
  const filteredExercises = exercises.filter(ex => ex.muscleGroup === selectedMuscleGroup);
  
  // Find the dynamic weight step for the math buttons (default to 5 if unknown)
  const currentExerciseData = exercises.find(ex => ex.id === parseInt(selectedExercise));
  const weightStep = currentExerciseData?.weightIncrement || 5;

// Automatically manage daily sessions
  useEffect(() => {
    const today = new Date().toDateString();
    const savedSession = JSON.parse(localStorage.getItem('current_session'));

    // If we already have a session for today, load it.
    // If not, do NOTHING yet! We will create it when they log their first set.
    if (savedSession && savedSession.date === today) {
      setSessionId(savedSession.id);
      console.log("Existing session found for today. Session ID:", savedSession.id);
    }
  }, []);

  // 1. Listen for PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // 2. Listen for Internet Connection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSets().then(() => checkPendingSets()); 
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Chart Data when Stats are toggled
  useEffect(() => {
    if (showStats && selectedExercise) {
      axios.get(`/api/exercises/${selectedExercise}/progression`)
        .then(response => setChartData(response.data))
        .catch(error => console.error("Error loading chart:", error));
    }
  }, [showStats, selectedExercise, loggedSets]); // re-run if they log a new set!

  const checkPendingSets = () => {
    const offlineSets = JSON.parse(localStorage.getItem('workout_offline_sets') || '[]');
    setPendingSyncCount(offlineSets.length);
  };

  useEffect(() => {
    checkPendingSets();
    const interval = setInterval(checkPendingSets, 2000);
    return () => clearInterval(interval);
  }, []);

  // 3. Fetch Exercises on Load
  useEffect(() => {
    axios.get('/api/exercises')
      .then(response => {
        setExercises(response.data);
        localStorage.setItem('cached_exercises', JSON.stringify(response.data));
      })
      .catch(error => {
        const cached = localStorage.getItem('cached_exercises');
        if (cached) setExercises(JSON.parse(cached));
      });
  }, []);

  // 4. Fetch History when Exercise Changes
  useEffect(() => {
    if (!selectedExercise) {
      setPreviousSets([]);
      return;
    }
    
    axios.get(`/api/exercises/${selectedExercise}/history`)
      .then(response => {
        setPreviousSets(response.data);
        if (response.data.length > 0) {
          const firstSet = response.data[0];
          setWeight(firstSet.weight || 0);
          setReps(firstSet.reps || 0);
          setTargetReps(firstSet.targetReps || 0);
          setIsDropSet(firstSet.isDropSet || false);
        }
      })
      .catch(error => {
        setPreviousSets([]);
        setWeight(0); setReps(0); setTargetReps(0); setIsDropSet(false);
      });
  }, [selectedExercise]);

  // 5. Add Custom Exercise
  const handleAddExercise = () => {
    if (!newExName || !selectedMuscleGroup) return;

    const newExercise = {
      name: newExName,
      muscleGroup: selectedMuscleGroup,
      weightIncrement: parseFloat(newExIncrement)
    };

    axios.post('/api/exercises', newExercise)
      .then(response => {
        const updatedExercises = [...exercises, response.data];
        setExercises(updatedExercises);
        localStorage.setItem('cached_exercises', JSON.stringify(updatedExercises));
        
        setSelectedExercise(response.data.id.toString());
        setShowAddForm(false);
        setNewExName('');
      })
      .catch(error => console.error("Error adding exercise:", error));
  };

// 6. Log the Set
  const handleLogSet = async () => {
    let activeSessionId = sessionId;

    // 1. If we don't have a session for today yet, create it right now!
    if (!activeSessionId) {
      try {
        const today = new Date().toDateString();
        const response = await axios.post('/api/sessions', { overallNotes: "Daily Workout" });
        activeSessionId = response.data.id;
        
        // Save it to state and local storage so subsequent sets use the same ID
        setSessionId(activeSessionId);
        localStorage.setItem('current_session', JSON.stringify({ 
          id: activeSessionId, 
          date: today 
        }));
      } catch (error) {
        console.error("Failed to create session:", error);
        alert("Network error: Could not start the workout session.");
        return; // Stop them from logging if the server is unreachable
      }
    }

    // 2. Prepare the set data
    const newSet = { 
      exerciseId: parseInt(selectedExercise), 
      weight, 
      reps, 
      targetReps, 
      isDropSet,
      unit 
    };

    // 3. Optimistically update the UI instantly
    setLoggedSets([...loggedSets, newSet]);
    setIsDropSet(false);

    // 4. Save the set to the database using the active ID
    axios.post(`/api/sessions/${activeSessionId}/sets`, newSet)
      .then(response => console.log("Saved directly!"))
      .catch(error => {
        saveOfflineSet(activeSessionId, newSet);
        checkPendingSets();
      });
  };

    setLoggedSets([...loggedSets, newSet]);
    setIsDropSet(false);

    axios.post(`/api/sessions/${sessionId}/sets`, newSet)
      .then(response => console.log("Saved directly!"))
      .catch(error => {
        saveOfflineSet(sessionId, newSet);
        checkPendingSets();
      });
  };

  // Helpers
  const adjustValue = (setter, amount) => {
    setter(prev => {
      const numericPrev = parseFloat(prev) || 0;
      const result = numericPrev + amount;
      return Math.max(0, Number(result.toFixed(2))); 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSaveIncrement = () => {
    const parsed = parseFloat(customIncrementVal);
    if (isNaN(parsed) || parsed <= 0) return;

    axios.put(`/api/exercises/${selectedExercise}/increment`, { newIncrement: parsed })
      .then(() => {
        // Update the React UI instantly
        const updatedExercises = exercises.map(ex => 
          ex.id === parseInt(selectedExercise) ? { ...ex, weightIncrement: parsed } : ex
        );
        setExercises(updatedExercises);
        localStorage.setItem('cached_exercises', JSON.stringify(updatedExercises));
        setIsEditingIncrement(false);
      })
      .catch(err => console.error("Error updating increment:", err));
  };

  // Don't render the app until the database gives us a real Session ID
  // if (!sessionId) {
  //   return (
  //     <div className="min-h-screen bg-slate-900 flex items-center justify-center text-emerald-400 font-bold animate-pulse">
  //       Loading Workout Data...
  //     </div>
  //   );
  // }

  return (
    <div className="max-w-md mx-auto bg-slate-900 min-h-screen text-slate-100 p-4 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-emerald-400">Workout</h2>
        <div className="flex space-x-2 items-center">
          {isInstallable && (
            <button onClick={handleInstallClick} className="flex items-center text-emerald-900 bg-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 shadow-sm">
              <Download size={14} className="mr-1.5" /> Install
            </button>
          )}
          {!isOnline && (
            <div className="flex items-center text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <WifiOff size={14} className="mr-1.5" /> Offline
            </div>
          )}
          {pendingSyncCount > 0 && (
            <div onClick={() => { if(isOnline) syncOfflineSets().then(checkPendingSets); }} className={`flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isOnline ? 'text-blue-400 bg-blue-400/10 cursor-pointer' : 'text-slate-400 bg-slate-800'}`}>
              <CloudUpload size={14} className="mr-1.5" /> {pendingSyncCount}
            </div>
          )}
        </div>
      </div>

      {/* MUSCLE GROUP SELECTOR */}
      <select 
        className="w-full bg-slate-800 text-emerald-400 p-4 rounded-xl mb-4 border border-slate-700 focus:outline-none focus:border-emerald-500 text-lg font-bold appearance-none"
        value={selectedMuscleGroup}
        onChange={(e) => {
          setSelectedMuscleGroup(e.target.value);
          setSelectedExercise(''); 
          setShowAddForm(false);
        }}
      >
        <option value="">Select Muscle Group...</option>
        {muscleGroups.map(group => (
          <option key={group} value={group}>{group}</option>
        ))}
      </select>

      {/* EXERCISE SELECTOR & ADD BUTTON */}
      {selectedMuscleGroup && (
        <div className="flex space-x-2 mb-6">
          <select 
            className="flex-1 bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 text-lg appearance-none"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
          >
            <option value="">Select Exercise...</option>
            {filteredExercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`p-4 rounded-xl border flex items-center justify-center transition-colors ${showAddForm ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-slate-800 border-slate-700 text-emerald-400'}`}
          >
            {showAddForm ? <X size={24} /> : <PlusCircle size={24} />}
          </button>
        </div>
      )}

      {/* ADD CUSTOM EXERCISE FORM */}
      {showAddForm && selectedMuscleGroup && (
        <div className="bg-slate-800 p-5 rounded-xl border border-emerald-500 mb-6 shadow-lg">
          <h4 className="text-emerald-400 font-bold mb-3">Add to {selectedMuscleGroup}</h4>
          <input 
            type="text" 
            placeholder="Exercise Name (e.g. Incline Press)" 
            className="w-full bg-slate-900 text-white p-3 rounded-lg border border-slate-700 focus:outline-none focus:border-emerald-500 mb-4"
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
          />
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Weight Jump (per click):</span>
            <input 
              type="number" 
              className="w-24 bg-slate-900 text-white p-2 rounded-lg border border-slate-700 text-center font-bold"
              value={newExIncrement}
              onChange={(e) => setNewExIncrement(e.target.value)}
            />
          </div>
          <button 
            onClick={handleAddExercise} 
            className="w-full p-3 bg-emerald-500 text-slate-900 font-bold rounded-lg active:bg-emerald-400"
          >
            Save Exercise
          </button>
        </div>
      )}

      {selectedExercise && (
        <div className="space-y-6">
          
          {/* "LAST TIME" GHOST TEXT WITH DATE & STATS TOGGLE */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 transition-all">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center text-slate-400 text-sm font-semibold tracking-wider uppercase">
                <History size={16} className="mr-2" /> Last Time
              </div>
              
              <div className="flex items-center space-x-3">
                {previousSets.length > 0 && previousSets[0].date && (
                  <span className="text-xs text-slate-500 font-medium bg-slate-900 px-2 py-1 rounded">
                    {formatDate(previousSets[0].date)}
                  </span>
                )}
                <button 
                  onClick={() => setShowStats(!showStats)}
                  className={`p-1.5 rounded-md transition-colors ${showStats ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}`}
                >
                  <TrendingUp size={16} />
                </button>
              </div>
            </div>

            {/* THE CHART PANEL */}
            {showStats ? (
              <div className="h-48 w-full mt-2 mb-2 bg-slate-900/50 rounded-lg p-2">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="Date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#34d399' }}
                        itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                      />
                      <Line type="monotone" dataKey="TotalVolume" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                    Log more workouts to see progression!
                  </div>
                )}
              </div>
            ) : (
              /* THE STANDARD HISTORY LIST */
              <div className="space-y-2">
                {previousSets.map((set, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-300 bg-slate-700/50 p-2 rounded-lg">
                    <span>
                      {set.weight > 0 && `${set.weight} ${set.unit || 'lbs'} × `}
                      <span className={set.reps < set.targetReps ? "text-red-400" : "text-emerald-400"}>
                        {set.reps} {set.reps < set.targetReps && `(${set.targetReps}😑)`}
                      </span>
                      {set.isDropSet && <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Drop</span>}
                    </span>
                    <button 
                      onClick={() => { setWeight(set.weight); setReps(set.reps); setTargetReps(set.targetReps); setIsDropSet(set.isDropSet); setUnit(set.unit || 'lbs'); }}
                      className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                ))}
                {previousSets.length === 0 && (
                  <div className="text-slate-500 text-sm italic">No history yet. Time to set a baseline!</div>
                )}
              </div>
            )}
          </div>

          {/* QUICK ENTRY CONTROLS */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            
            {/* Dynamic Weight Control & Unit Toggle */}
            <div className="flex justify-between items-center mb-6">
              <button 
                onClick={() => setUnit(unit === 'lbs' ? 'kg' : 'lbs')}
                className="text-emerald-400 font-bold w-16 bg-emerald-400/10 p-3 rounded-lg text-center active:bg-emerald-400/20 transition-colors"
              >
                {unit.toUpperCase()}
              </button>
              <button onClick={() => adjustValue(setWeight, -weightStep)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Minus size={24} /></button>
              <span className="text-3xl font-bold w-20 text-center">{weight}</span>
              <button onClick={() => adjustValue(setWeight, weightStep)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Plus size={24} /></button>
            </div>

            {/* NEW: Editable Weight Jump Indicator */}
            <div className="flex justify-center items-center mt-2 mb-6 text-slate-400 text-sm">
              {isEditingIncrement ? (
                <div className="flex items-center space-x-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-500">
                  <span className="font-medium">Step:</span>
                  <input 
                    type="number" 
                    value={customIncrementVal} 
                    onChange={e => setCustomIncrementVal(e.target.value)}
                    className="w-16 bg-transparent text-emerald-400 text-center font-bold focus:outline-none"
                    step="0.5"
                    autoFocus
                  />
                  <button onClick={handleSaveIncrement} className="text-emerald-400 hover:text-emerald-300 ml-1"><Check size={16}/></button>
                  <button onClick={() => setIsEditingIncrement(false)} className="text-red-400 hover:text-red-300 ml-2"><X size={16}/></button>
                </div>
              ) : (
                <button 
                  onClick={() => { setCustomIncrementVal(weightStep); setIsEditingIncrement(true); }} 
                  className="flex items-center hover:text-emerald-400 transition-colors py-1 px-3 rounded bg-slate-900/50"
                >
                  <span>Weight Step: <strong className="text-slate-300">{weightStep}</strong></span>
                  <span className="ml-2 text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Edit ✎</span>
                </button>
              )}
            </div>

            {/* Reps Control */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-400 font-medium w-16 text-center">REPS</span>
              <button onClick={() => adjustValue(setReps, -1)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Minus size={24} /></button>
              <span className="text-3xl font-bold w-20 text-center">{reps}</span>
              <button onClick={() => adjustValue(setReps, 1)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Plus size={24} /></button>
            </div>

            {/* Drop Set Toggle */}
            <div className="flex items-center justify-between mb-6 p-3 bg-slate-900 rounded-lg">
               <span className="text-slate-300 font-medium ml-2">Drop Set?</span>
               <input 
                  type="checkbox" 
                  checked={isDropSet} 
                  onChange={(e) => setIsDropSet(e.target.checked)}
                  className="w-6 h-6 rounded text-emerald-500 bg-slate-700 border-slate-600 focus:ring-emerald-500"
               />
            </div>

            {/* Huge Log Button */}
            <button 
              onClick={handleLogSet}
              className="w-full bg-emerald-500 text-slate-900 font-bold text-xl p-5 rounded-xl flex items-center justify-center active:bg-emerald-400 transition-colors shadow-md"
            >
              <Check size={28} className="mr-2" /> Log Set
            </button>
          </div>
        </div>
      )}

      {/* SESSION SUMMARY */}
      {loggedSets.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4 text-slate-300">Today's Sets</h3>
          <div className="space-y-3">
            {loggedSets.map((set, index) => {
              const exerciseName = exercises.find(e => e.id === set.exerciseId)?.name || 'Unknown Exercise';
              return (
                <div key={index} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-slate-200">{exerciseName}</div>
                    <div className="text-sm text-slate-400">
                      Set {index + 1}
                      {set.isDropSet && <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Drop Set</span>}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    {set.weight > 0 ? `${set.weight} ${set.unit || 'lbs'} × ` : ''} 
                    {set.reps} {set.reps < set.targetReps && <span className="text-red-400 text-sm">({set.targetReps}😑)</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}