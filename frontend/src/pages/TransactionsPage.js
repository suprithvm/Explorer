import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Flex,
  VStack,
  HStack,
  Skeleton,
  Select,
  Alert,
  AlertIcon,
  InputGroup,
  InputLeftElement,
  Input,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@chakra-ui/icons';
import { getLatestTransactions } from '../services/api';
import TransactionCard from '../components/transactions/TransactionCard';
import { useWebSocket } from '../contexts/WebSocketContext';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalTxs, setTotalTxs] = useState(0);
  const [searchTx, setSearchTx] = useState('');
  
  const { lastTransaction } = useWebSocket();

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getLatestTransactions(page, limit);
        setTransactions(response.data);
        setTotalTxs(response.pagination?.total || 0);
        setHasMore(response.pagination?.hasNext || false);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transactions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactions();
  }, [page, limit]);

  // Update transactions list when new transaction is received via WebSocket
  useEffect(() => {
    if (lastTransaction && page === 1) {
      setTransactions(prev => {
        // Check if the transaction is already in the list
        if (prev.some(tx => tx.hash === lastTransaction.hash)) {
          return prev;
        }
        
        // Add new transaction to the beginning and remove the last one to maintain the length
        const updated = [lastTransaction, ...prev.slice(0, prev.length - 1)];
        return updated;
      });
      
      // Increment total transactions count
      setTotalTxs(prev => prev + 1);
    }
  }, [lastTransaction, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTx.trim()) {
      // If it looks like a transaction hash, navigate to transaction details
      if (searchTx.trim().startsWith('0x')) {
        window.location.href = `/tx/${searchTx.trim()}`;
      }
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Transactions
        </Heading>
        
        <Flex>
          <form onSubmit={handleSearch}>
            <InputGroup size="md" mr={4}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by transaction hash"
                value={searchTx}
                onChange={(e) => setSearchTx(e.target.value)}
                borderRadius="md"
              />
            </InputGroup>
          </form>
          
          <Select 
            value={limit} 
            onChange={(e) => setLimit(Number(e.target.value))}
            w="100px"
            size="md"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </Flex>
      </Flex>

      {error ? (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <>
          <Box mb={4}>
            <Text color="gray.500">
              Showing transactions {Math.min(1, (page - 1) * limit + 1)} to {Math.min(page * limit, totalTxs)} of {totalTxs} total transactions
            </Text>
          </Box>
          
          <VStack spacing={4} align="stretch" mb={6}>
            {isLoading ? (
              Array(limit).fill(0).map((_, i) => (
                <Skeleton key={i} height="120px" />
              ))
            ) : transactions.length > 0 ? (
              transactions.map(tx => (
                <TransactionCard key={tx.hash} transaction={tx} />
              ))
            ) : (
              <Box textAlign="center" py={8}>
                <Text>No transactions found</Text>
              </Box>
            )}
          </VStack>
          
          <Flex justify="center">
            <HStack>
              <Button 
                leftIcon={<ChevronLeftIcon />} 
                onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                isDisabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <Text>Page {page}</Text>
              <Button 
                rightIcon={<ChevronRightIcon />} 
                onClick={() => setPage(prev => prev + 1)} 
                isDisabled={!hasMore || isLoading}
              >
                Next
              </Button>
            </HStack>
          </Flex>
        </>
      )}
    </Container>
  );
} 