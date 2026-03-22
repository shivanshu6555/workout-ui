import React, { useState, useEffect } from 'react';
import { Plus, Minus, Check, Copy, History, WifiOff, CloudUpload, Download } from 'lucide-react';
import axios from 'axios';
import { saveOfflineSet, syncOfflineSets } from './syncManager';

export default function WorkoutLogger({ sessionId = 1 }) {
  // Application State
  const [exercises, setExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [previousSets, setPreviousSets] = useState([]);
  const [loggedSets, setLoggedSets] = useState([]);

  // Form State
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [targetReps, setTargetReps] = useState(0);
  const [isDropSet, setIsDropSet] = useState(false);

  // Network & Sync State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  // 1. Listen for PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI to show the install button
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  // 2. Listen for Internet Connection Changes
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

  // 3. Poll for pending offline sets
  const checkPendingSets = () => {
    const offlineSets = JSON.parse(localStorage.getItem('workout_offline_sets') || '[]');
    setPendingSyncCount(offlineSets.length);
  };

  useEffect(() => {
    checkPendingSets();
    const interval = setInterval(checkPendingSets, 2000);
    return () => clearInterval(interval);
  }, []);

  // 4. Fetch Exercises on Load
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

  // 5. Fetch History when Exercise Changes
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

  // 6. Log the Set
  const handleLogSet = () => {
    const newSet = { 
      exerciseId: parseInt(selectedExercise), 
      weight, 
      reps, 
      targetReps, 
      isDropSet 
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

  const adjustValue = (setter, amount) => {
    setter(prev => {
      const numericPrev = parseFloat(prev) || 0;
      const result = numericPrev + amount;
      return Math.max(0, Number(result.toFixed(2))); 
    });
  };

  return (
    <div className="max-w-md mx-auto bg-slate-900 min-h-screen text-slate-100 p-4 font-sans pb-20">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-400">Workout</h2>
        <div className="flex space-x-2 items-center">
          
          {/* INSTALL APP BUTTON */}
          {isInstallable && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center text-emerald-900 bg-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-emerald-300 transition-colors shadow-sm"
            >
              <Download size={14} className="mr-1.5" /> Install
            </button>
          )}

          {!isOnline && (
            <div className="flex items-center text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <WifiOff size={14} className="mr-1.5" /> Offline
            </div>
          )}
          {pendingSyncCount > 0 && (
            <div 
              onClick={() => { if(isOnline) syncOfflineSets().then(checkPendingSets); }}
              className={`flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${isOnline ? 'text-blue-400 bg-blue-400/10 cursor-pointer hover:bg-blue-400/20' : 'text-slate-400 bg-slate-800'}`}
            >
              <CloudUpload size={14} className="mr-1.5" /> {pendingSyncCount}
            </div>
          )}
        </div>
      </div>

      {/* Exercise Selector */}
      <select 
        className="w-full bg-slate-800 text-white p-4 rounded-xl mb-6 border border-slate-700 focus:outline-none focus:border-emerald-500 text-lg appearance-none"
        value={selectedExercise}
        onChange={(e) => setSelectedExercise(e.target.value)}
      >
        <option value="">Select Exercise...</option>
        {exercises.map(ex => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {selectedExercise && (
        <div className="space-y-6">
          
          {/* "LAST TIME" GHOST TEXT */}
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center text-slate-400 mb-3 text-sm font-semibold tracking-wider uppercase">
              <History size={16} className="mr-2" /> Last Time
            </div>
            <div className="space-y-2">
              {previousSets.map((set, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-300 bg-slate-700/50 p-2 rounded-lg">
                  <span>
                    {set.weight > 0 && `${set.weight} lbs × `}
                    <span className={set.reps < set.targetReps ? "text-red-400" : "text-emerald-400"}>
                      {set.reps} {set.reps < set.targetReps && `(${set.targetReps}😑)`}
                    </span>
                    {set.isDropSet && <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded">Drop</span>}
                  </span>
                  <button 
                    onClick={() => { setWeight(set.weight); setReps(set.reps); setTargetReps(set.targetReps); setIsDropSet(set.isDropSet); }}
                    className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* QUICK ENTRY CONTROLS */}
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            
            {/* Weight Control */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-400 font-medium w-16">Lbs</span>
              <button onClick={() => adjustValue(setWeight, -5)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Minus size={24} /></button>
              <span className="text-3xl font-bold w-20 text-center">{weight}</span>
              <button onClick={() => adjustValue(setWeight, 5)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Plus size={24} /></button>
            </div>

            {/* Reps Control */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-400 font-medium w-16">Reps</span>
              <button onClick={() => adjustValue(setReps, -1)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Minus size={24} /></button>
              <span className="text-3xl font-bold w-20 text-center">{reps}</span>
              <button onClick={() => adjustValue(setReps, 1)} className="p-4 bg-slate-700 rounded-xl active:bg-slate-600"><Plus size={24} /></button>
            </div>

            {/* Drop Set Toggle */}
            <div className="flex items-center justify-between mb-6 p-2 bg-slate-900 rounded-lg">
               <span className="text-slate-300 font-medium ml-2">Drop Set?</span>
               <input 
                  type="checkbox" 
                  checked={isDropSet} 
                  onChange={(e) => setIsDropSet(e.target.checked)}
                  className="w-6 h-6 rounded text-emerald-500 bg-slate-700 border-slate-600 focus:ring-emerald-500 focus:ring-2"
               />
            </div>

            {/* Huge Log Button */}
            <button 
              onClick={handleLogSet}
              className="w-full bg-emerald-500 text-slate-900 font-bold text-xl p-5 rounded-xl flex items-center justify-center active:bg-emerald-400 transition-colors"
            >
              <Check size={28} className="mr-2" /> Log Set
            </button>
          </div>
        </div>
      )}

      {/* SESSION SUMMARY (Today's Sets) */}
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
                    {set.weight > 0 ? `${set.weight} lbs × ` : ''} 
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