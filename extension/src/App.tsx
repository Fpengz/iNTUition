import { useState } from 'react'
import './App.css'

function App() {
  const [explanation, setExplanation] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleExplain = async () => {
    setLoading(true)
    try {
      // 1. Get DOM from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) return

      const domData = await chrome.tabs.sendMessage(tab.id, { action: "GET_DOM" })

      // 2. Send to Backend
      const response = await fetch('http://localhost:8000/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(domData)
      })
      const data = await response.json()
      setExplanation(data.explanation)
    } catch (err) {
      setExplanation("Aura couldn't reach the page or backend. Make sure the backend is running at :8000")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="aura-container" style={{ width: '300px', padding: '1rem' }}>
      <h1>Aura</h1>
      <button onClick={handleExplain} disabled={loading}>
        {loading ? 'Thinking...' : 'Explain this Page'}
      </button>
      
      {explanation && (
        <div className="explanation-box" style={{ marginTop: '1rem', textAlign: 'left', background: '#f4f4f4', padding: '0.5rem', color: '#333', borderRadius: '8px' }}>
          <p>{explanation}</p>
        </div>
      )}
    </div>
  )
}

export default App

