import React, { useState, useEffect, useRef } from 'react';
import { FiSend } from 'react-icons/fi';
import './ChatPanel.css';

const ChatPanel = ({ socket, meetingId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Request chat history when component mounts
    socket.emit('get-chat-history', { meetingId });

    // Listen for chat history
    socket.on('chat-history', (history) => {
      setMessages(history);
    });

    // Listen for new messages
    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('chat-history');
      socket.off('receive-message');
    };
  }, [socket, meetingId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    socket.emit('send-message', {
      meetingId,
      userId: currentUser._id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || '',
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>Meeting Chat</h3>
        <span className="message-count">{messages.length} messages</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg._id || index} 
              className={`message ${msg.userId === currentUser._id ? 'own-message' : ''}`}
            >
              <div className="message-header">
                {msg.userAvatar && (
                  <img src={msg.userAvatar} alt={msg.userName} className="message-avatar" />
                )}
                {!msg.userAvatar && (
                  <div className="message-avatar-placeholder">
                    {msg.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="message-sender">{msg.userName}</span>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="message-content">{msg.message}</div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={1000}
        />
        <button type="submit" className="send-button" disabled={!newMessage.trim()}>
          <FiSend />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
