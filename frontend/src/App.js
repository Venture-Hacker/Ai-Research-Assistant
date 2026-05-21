import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to UI
    const userMsg = { sender: 'User', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Send request to Django Backend
      const response = await axios.post('http://localhost:8000/api/test-chat/', {
        message: input
      });

      // Add AI response to UI
      const aiMsg = { sender: 'Llama-3 (Groq)', text: response.data.response };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error communicating with backend:", error);
      const errorMsg = { sender: 'System Error', text: 'Failed to reach the AI backend.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Zero-Cost AI Assistant</h2>
      
      <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'auto', padding: '10px', marginBottom: '10px', textAlign: 'left', borderRadius: '5px' }}>
        {messages.length === 0 ? <p style={{ color: '#888' }}>Ask me a technical question...</p> : null}
        
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <strong>{msg.sender}:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '5px 0' }}>{msg.text}</pre>
          </div>
        ))}
        {isLoading && <p style={{ color: '#888', fontStyle: 'italic' }}>Thinking...</p>}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Type your message..."
          style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
}

export default App;