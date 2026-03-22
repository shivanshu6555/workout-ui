import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import WorkoutLogger from './WorkoutLogger'

function App() {
  const [count, setCount] = useState(0)

  return (
    <WorkoutLogger sessionId={1} />
  )
}

export default App
