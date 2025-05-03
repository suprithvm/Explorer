import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Network stats
export const getNetworkStats = async () => {
  try {
    const response = await api.get('/stats/network');
    
    // Normalize data types to prevent frontend errors
    const data = response.data;
    return {
      blockNumber: parseInt(data.blockNumber) || 0,
      difficulty: data.difficulty || '0',
      average_block_time: parseFloat(data.average_block_time) || 0,
      total_blocks: parseInt(data.total_blocks) || 0,
      total_transactions: parseInt(data.total_transactions) || 0,
      active_validators: parseInt(data.active_validators) || 0
    };
  } catch (error) {
    console.error('Error fetching network stats:', error);
    throw error;
  }
};

// Blocks
export const getLatestBlocks = async (page = 1, limit = 10) => {
  try {
    const response = await api.get(`/blocks?page=${page}&limit=${limit}`);
    // Return a consistent structure so the frontend always gets { data: [...] }
    return {
      data: response.data.blocks || []
    };
  } catch (error) {
    console.error('Error fetching latest blocks:', error);
    // Return empty data instead of throwing to prevent crashes
    return { data: [] };
  }
};

export const getBlockByIdentifier = async (identifier) => {
  try {
    const response = await api.get(`/blocks/${identifier}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching block ${identifier}:`, error);
    throw error;
  }
};

export const getBlockTransactions = async (identifier, page = 1, limit = 20) => {
  try {
    const response = await api.get(`/blocks/${identifier}/transactions?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching transactions for block ${identifier}:`, error);
    throw error;
  }
};

// Transactions
export const getLatestTransactions = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/transactions?page=${page}&limit=${limit}`);
    // Return a consistent structure so the frontend always gets { data: [...] }
    return {
      data: response.data.transactions || []
    };
  } catch (error) {
    console.error('Error fetching latest transactions:', error);
    // Return empty data instead of throwing to prevent crashes
    return { data: [] };
  }
};

export const getTransactionByHash = async (hash) => {
  try {
    const response = await api.get(`/transactions/${hash}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching transaction ${hash}:`, error);
    throw error;
  }
};

export const searchTransactions = async (params, page = 1, limit = 20) => {
  try {
    const queryParams = new URLSearchParams({
      ...params,
      page,
      limit,
    });
    
    const response = await api.get(`/transactions/search?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error searching transactions:', error);
    throw error;
  }
};

// Addresses
export const getAddressDetails = async (address) => {
  try {
    const response = await api.get(`/address/${address}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching address ${address}:`, error);
    throw error;
  }
};

export const getAddressTransactions = async (address, page = 1, limit = 20) => {
  try {
    const response = await api.get(`/address/${address}/transactions?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching transactions for address ${address}:`, error);
    throw error;
  }
};

export const getAddressBlocks = async (address, page = 1, limit = 20) => {
  try {
    const response = await api.get(`/address/${address}/blocks?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching blocks for address ${address}:`, error);
    throw error;
  }
};

// Validators
export const getValidators = async (page = 1, limit = 20) => {
  try {
    const response = await api.get(`/stats/validators?page=${page}&limit=${limit}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching validators:', error);
    throw error;
  }
};

// Search
export const search = async (query) => {
  try {
    const response = await api.get(`/stats/search?query=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    throw error;
  }
};

export default api; 