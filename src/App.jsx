import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import WorkoutLogger from './WorkoutLogger'
import Auth from './Auth'

function App() {
  const [count, setCount] = useState(0)
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // When the app opens, check if they left their wristband from yesterday!
  useEffect(() => {
    const savedToken = localStorage.getItem('jwt_token');
    if (savedToken) {
      setToken(savedToken);
    }
    setIsLoading(false);
  }, []);

  if (isLoading) return <div className="min-h-screen bg-slate-900"></div>;

  // The Bouncer Logic
  if (!token) {
    return <Auth onLoginSuccess={(newToken) => setToken(newToken)} />;
  }

  return (
    <WorkoutLogger/>
  )
}

export default App
