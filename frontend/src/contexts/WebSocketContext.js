import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// Create WebSocket context
const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastBlock, setLastBlock] = useState(null);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [clientId, setClientId] = useState(null);
  
  // Use refs to prevent multiple connections and keep track of intervals
  const socketRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isComponentMounted = useRef(true);
  const hasConnected = useRef(false);
  
  // Handle new block notification
  const handleNewBlock = useCallback((blockData) => {
    console.log('New block received from WebSocket:', blockData);
    
    // Ensure we have valid data before updating state
    if (blockData && (blockData.hash || blockData.number)) {
      const normalizedBlock = {
        hash: blockData.hash || `unknown-${Date.now()}`,
        number: parseInt(blockData.number) || 0,
        miner: blockData.miner || blockData.MinedBy || '',
        validator: blockData.validator || blockData.ValidatedBy || '',
        txCount: blockData.txCount || 0,
        timestamp: blockData.timestamp || Math.floor(Date.now() / 1000)
      };
      
      setLastBlock(normalizedBlock);
    }
  }, []);
  
  // Handle new transaction notification
  const handleNewTransaction = useCallback((txData) => {
    console.log('New transaction received from WebSocket:', txData);
    
    // Ensure we have valid data before updating state
    if (txData && txData.hash) {
      const normalizedTx = {
        hash: txData.hash,
        from: txData.from || txData.Sender || '',
        to: txData.to || txData.Receiver || '',
        value: parseFloat(txData.value || txData.Amount || 0),
        timestamp: txData.timestamp || Math.floor(Date.now() / 1000)
      };
      
      setLastTransaction(normalizedTx);
    }
  }, []);
  
  // Clean up existing connections and timers
  const cleanupConnection = useCallback(() => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      // Only close if it's in a state where we can close it
      if (socketRef.current.readyState === WebSocket.OPEN || 
          socketRef.current.readyState === WebSocket.CONNECTING) {
        console.log("Closing existing WebSocket connection");
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  }, []);
  
  // WebSocket connection setup
  const connectWebSocket = useCallback(() => {
    // Avoid duplicate connections in Strict Mode
    if (hasConnected.current) {
      console.log('Already attempted connection in this render cycle, skipping duplicate request');
      return;
    }
    
    // Don't connect if we're unmounted
    if (!isComponentMounted.current) {
      console.log('Component unmounted, skipping connection');
      return;
    }
    
    // Don't connect if we already have an active connection
    if (socketRef.current && 
        (socketRef.current.readyState === WebSocket.CONNECTING || 
         socketRef.current.readyState === WebSocket.OPEN)) {
      console.log('WebSocket connection already exists. Skipping new connection.');
      return;
    }
    
    // Set flag to avoid duplicate connections
    hasConnected.current = true;
    
    // Clean up existing connection
    cleanupConnection();
    
    try {
      console.log(`Attempting WebSocket connection (attempt ${connectionAttempts + 1})...`);
      setConnectionAttempts(prev => prev + 1);
      
      // Ensure URL has /ws and uses correct protocol
      const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001/ws';
      console.log(`Connecting to WebSocket URL: ${WS_URL}`);
      
      const ws = new WebSocket(WS_URL);
      socketRef.current = ws;
      
      // Connection timeout - if not connected within 5 seconds, try again
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('Connection attempt timed out');
          ws.close();
        }
      }, 5000);
      
      ws.onopen = () => {
        console.log('Connected to Explorer WebSocket server');
        clearTimeout(connectionTimeout);
        setIsConnected(true);
        setConnectionAttempts(0);
        
        // Ping every 20 seconds to keep connection alive
        // (server pings every 30s, so this ensures we respond before timeout)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            console.log('Sending ping to keep connection alive');
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 20000);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle connection confirmation and set clientId
          if (message.event === 'connection' && message.data) {
            if (message.data.clientId) {
              setClientId(message.data.clientId);
              console.log(`Connection confirmed with client ID: ${message.data.clientId}`);
            }
          }
          // Handle new block event
          else if (message.event === 'new_block' && message.data) {
            handleNewBlock(message.data);
          } 
          // Handle new transaction event
          else if (message.event === 'new_transaction' && message.data) {
            handleNewTransaction(message.data);
          }
          // Handle ping/pong for keepalive
          else if (message.type === 'pong') {
            console.log('Received pong from server');
          }
          else {
            console.log('WebSocket message received:', message);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          console.log('Raw message:', event.data);
        }
      };
      
      ws.onclose = (event) => {
        const reason = event.reason || 'Unknown reason';
        const code = event.code;
        console.log(`WebSocket connection closed: ${code} ${reason}`);
        clearTimeout(connectionTimeout);
        setIsConnected(false);
        setClientId(null);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Reset connection flag after a short delay
        // This prevents React 18 Strict Mode from creating multiple connections
        setTimeout(() => {
          hasConnected.current = false;
        }, 500);
        
        // Only attempt reconnection if component is still mounted
        if (isComponentMounted.current) {
          // Exponential backoff for reconnection (max 30 seconds)
          const delay = Math.min(1000 * (2 ** Math.min(connectionAttempts, 5)), 30000);
          
          // Prevent multiple reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isComponentMounted.current && connectionAttempts < 10) {
              console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
              connectWebSocket();
            } else if (isComponentMounted.current) {
              console.log('Max reconnection attempts reached. Please refresh the page.');
            }
          }, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(connectionTimeout);
      };
      
      setSocket(ws);
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
      
      // Reset connection flag after a short delay
      setTimeout(() => {
        hasConnected.current = false;
      }, 500);
    }
  }, [connectionAttempts, handleNewBlock, handleNewTransaction, cleanupConnection]);
  
  // Set up mount/unmount tracking
  useEffect(() => {
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      cleanupConnection();
    };
  }, [cleanupConnection]);
  
  // Initial connection setup - only connect once
  useEffect(() => {
    // React 18 Strict Mode runs effects twice in development
    // The hasConnected ref prevents duplicate connections
    connectWebSocket();
    
    // Cleanup on unmount is handled by the mount/unmount effect
  }, [connectWebSocket]);
  
  // Value to be passed to consumers
  const value = {
    socket,
    isConnected,
    lastBlock,
    lastTransaction,
    connectionAttempts,
    clientId,
    reconnect: () => {
      hasConnected.current = false; // Reset flag to allow reconnection
      connectWebSocket();
    }
  };
  
  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 