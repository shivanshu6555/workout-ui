import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import WorkoutLogger from './WorkoutLogger'
import Auth from './Auth'
import History from './History';

function App() {
  const [count, setCount] = useState(0)
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('logger');

  // When the app opens, check if they left their wristband from yesterday!
  useEffect(() => {
    const savedToken = localStorage.getItem('jwt_token');
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('current_session');
    setToken(null); // Instantly kicks them back to the <Auth /> screen
  };

  if (isLoading) return <div className="min-h-screen bg-slate-900"></div>;

  // The Bouncer Logic
  if (!token) {
    return <Auth onLoginSuccess={(newToken) => setToken(newToken)} />;
  }

  return (
   <div className="bg-slate-900 min-h-screen text-slate-100 font-sans pb-24">
      {/* Dynamic Content Area */}
      <div className="max-w-md mx-auto p-4">
        {currentView === 'logger' ? <WorkoutLogger /> : <History/>}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 pb-safe">
        <div className="max-w-md mx-auto flex justify-around p-3">
          
          {/* TRACK BUTTON */}
          <button 
            onClick={() => setCurrentView('logger')}
            className={`flex flex-col items-center flex-1 py-2 rounded-lg transition-colors ${currentView === 'logger' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="m14.4 14.4-4.8-4.8"/><path d="m7.2 21.6 2.4-2.4"/><path d="m16.8 2.4 2.4 2.4"/><path d="m2.4 16.8 2.4 2.4"/><path d="m19.2 7.2 2.4-2.4"/><path d="M10.8 19.2 6 14.4l-1.2 1.2a1.7 1.7 0 0 0 0 2.4l1.2 1.2a1.7 1.7 0 0 0 2.4 0Z"/><path d="M19.2 10.8 14.4 6l1.2-1.2a1.7 1.7 0 0 1 2.4 0l1.2 1.2a1.7 1.7 0 0 1 0 2.4Z"/></svg>
            <span className="text-xs font-bold">Track</span>
          </button>

          {/* HISTORY BUTTON */}
          <button 
            onClick={() => setCurrentView('history')}
            className={`flex flex-col items-center flex-1 py-2 rounded-lg transition-colors ${currentView === 'history' ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            <span className="text-xs font-bold">History</span>
          </button>

          {/* LOGOUT BUTTON */}
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center flex-1 py-2 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
            <span className="text-xs font-bold">Logout</span>
          </button>

        </div>
      </div>
    </div>
  )
}

export default App