import { useState } from 'react'
import './App.css'

function App() {
  const [explanation, setExplanation] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleExplain = async () => {
    setLoading(true)
    try {
      // 1. Check if we are in an extension environment
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        throw new Error("Aura must be run as a Chrome Extension. Please load the 'dist' folder in chrome://extensions")
      }

      // 2. Get DOM from content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) return

      const domData = await chrome.tabs.sendMessage(tab.id, { action: "GET_DOM" })
      if (!domData) {
        throw new Error("Content script not responding. Refresh the page.")
      }

      // 2. Send to Backend
      const payload = { dom_data: domData, profile: null }
      console.log("Sending to backend:", payload)
      const response = await fetch('http://127.0.0.1:8000/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`)
      }
      
      const data = await response.json()
      setExplanation(data.explanation)
    } catch (err: any) {
      console.error("Aura Full Error:", err)
      const errorMsg = err.message || "Unknown error"
      setExplanation(`Aura is having trouble connecting: ${errorMsg}. Please ensure the backend is running at http://127.0.0.1:8000 and the page is refreshed.`)
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

