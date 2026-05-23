import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('regular');   // 'regular' or 'rag'

  // PDF upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // ── Send chat message ──────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { sender: 'You', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Pick endpoint based on mode
    const endpoint = mode === 'rag'
      ? 'http://localhost:8000/api/rag-chat/'
      : 'http://localhost:8000/api/test-chat/';

    try {
      const response = await axios.post(endpoint, { message: input });
      const aiMsg = {
        sender: mode === 'rag' ? 'AI (RAG)' : 'Llama-3 (Groq)',
        text: response.data.response,
        sources: response.data.sources || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg = { sender: 'System Error', text: 'Failed to reach the backend.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Upload PDF ─────────────────────────────────────────────────────────
  const uploadPDF = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await axios.post('http://localhost:8000/api/ingest/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadStatus({ type: 'success', text: response.data.message });
      setSelectedFile(null);
    } catch (error) {
      setUploadStatus({ type: 'error', text: 'Upload failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '700px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>🤖 AI Technical Assistant</h2>

      {/* Mode Toggle */}
      <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
        <button
          onClick={() => setMode('regular')}
          style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: mode === 'regular' ? 'bold' : 'normal', background: mode === 'regular' ? '#4f46e5' : '#eee', color: mode === 'regular' ? 'white' : 'black', border: 'none', borderRadius: '6px' }}
        >
          💬 Regular Chat
        </button>
        <button
          onClick={() => setMode('rag')}
          style={{ padding: '8px 16px', cursor: 'pointer', fontWeight: mode === 'rag' ? 'bold' : 'normal', background: mode === 'rag' ? '#4f46e5' : '#eee', color: mode === 'rag' ? 'white' : 'black', border: 'none', borderRadius: '6px' }}
        >
          📄 Ask My Documents
        </button>
      </div>

      {/* PDF Upload (only shown in RAG mode) */}
      {mode === 'rag' && (
        <div style={{ marginBottom: '12px', padding: '12px', border: '1px dashed #aaa', borderRadius: '6px' }}>
          <strong>Upload a PDF:</strong>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files[0])} />
            <button onClick={uploadPDF} disabled={!selectedFile || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload & Ingest'}
            </button>
          </div>
          {uploadStatus && (
            <p style={{ color: uploadStatus.type === 'success' ? 'green' : 'red', marginTop: '6px' }}>
              {uploadStatus.text}
            </p>
          )}
        </div>
      )}

      {/* Chat Window */}
      <div style={{ border: '1px solid #ccc', height: '400px', overflowY: 'auto', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
        {messages.length === 0 && (
          <p style={{ color: '#888' }}>
            {mode === 'rag' ? 'Upload a PDF then ask a question about it...' : 'Ask me a technical question...'}
          </p>
        )}
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '15px' }}>
            <strong>{msg.sender}:</strong>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '5px 0' }}>{msg.text}</pre>
            {msg.sources && msg.sources.length > 0 && (
              <small style={{ color: '#666' }}>📎 Sources: {msg.sources.join(', ')}</small>
            )}
          </div>
        ))}
        {isLoading && <p style={{ color: '#888', fontStyle: 'italic' }}>Thinking...</p>}
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === 'rag' ? 'Ask about your documents...' : 'Type your message...'}
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
