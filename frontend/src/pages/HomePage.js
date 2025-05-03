import React, { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Stack,
  Text,
  Button,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider,
  useColorModeValue,
  Skeleton,
  Badge,
  Tooltip,
  IconButton,
} from '@chakra-ui/react';
import { ChevronRightIcon, RepeatIcon } from '@chakra-ui/icons';
import { useWebSocket } from '../contexts/WebSocketContext';
import BlockCard from '../components/blocks/BlockCard';
import TransactionCard from '../components/transactions/TransactionCard';
import { getLatestBlocks, getLatestTransactions, getNetworkStats } from '../services/api';

export default function HomePage() {
  const [latestBlocks, setLatestBlocks] = useState([]);
  const [latestTransactions, setLatestTransactions] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const { lastBlock, lastTransaction, isConnected, clientId, reconnect } = useWebSocket();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Function to fetch all data
  const fetchData = useCallback(async () => {
    try {
      console.log(`Fetching latest data at ${new Date().toISOString()}...`);
      const [blocks, transactions, stats] = await Promise.all([
        getLatestBlocks(1, 5),
        getLatestTransactions(1, 5),
        getNetworkStats(),
      ]);
      
      // Initialize with empty arrays if data is undefined
      setLatestBlocks(blocks?.data || []);
      setLatestTransactions(transactions?.data || []);
      setNetworkStats(stats || {});
      setLastDataFetch(new Date());
      
      console.log('Data fetched successfully:', {
        blockCount: blocks?.data?.length || 0,
        txCount: transactions?.data?.length || 0,
        blockNumber: stats?.blockNumber || 0
      });
    } catch (error) {
      console.error('Error fetching home page data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle manual reconnection
  const handleReconnect = useCallback(() => {
    console.log("Manually reconnecting WebSocket...");
    reconnect();
  }, [reconnect]);

  // Initial data fetch
  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);
  
  // Polling for updates every 30 seconds as fallback
  useEffect(() => {
    const interval = setInterval(() => {
      // Only use polling if WebSocket is not connected or it's been more than 2 minutes
      if (!isConnected || 
          (lastDataFetch && new Date() - lastDataFetch > 120000)) {
        console.log('Using polling fallback for data updates');
        fetchData();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData, isConnected, lastDataFetch]);

  // Update latest blocks when new block is received via WebSocket
  useEffect(() => {
    if (lastBlock && Array.isArray(latestBlocks)) {
      console.log('New block received via WebSocket:', lastBlock);
      
      // Check if this block is already in our list
      const alreadyExists = latestBlocks.some(b => 
        b.hash === lastBlock.hash || b.number === lastBlock.number
      );
      
      if (!alreadyExists) {
        setLatestBlocks(prev => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return [lastBlock];
          }
          // Add new block to the beginning and keep up to 5 most recent
          return [lastBlock, ...prev.slice(0, 4)];
        });
        
        // Update network stats
        setNetworkStats(prev => ({
          ...prev,
          blockNumber: lastBlock.number,
          total_blocks: (prev?.total_blocks || 0) + 1,
        }));
      }
    }
  }, [lastBlock, latestBlocks]);

  // Update latest transactions when new transaction is received via WebSocket
  useEffect(() => {
    if (lastTransaction && Array.isArray(latestTransactions)) {
      console.log('New transaction received via WebSocket:', lastTransaction);
      
      // Check if this transaction is already in our list
      const alreadyExists = latestTransactions.some(tx => 
        tx.hash === lastTransaction.hash
      );
      
      if (!alreadyExists) {
        setLatestTransactions(prev => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return [lastTransaction];
          }
          // Add new transaction to the beginning and keep up to 5 most recent
          return [lastTransaction, ...prev.slice(0, 4)];
        });
        
        // Update network stats
        setNetworkStats(prev => ({
          ...prev,
          total_transactions: (prev?.total_transactions || 0) + 1,
        }));
      }
    }
  }, [lastTransaction, latestTransactions]);

  // Show connection badge with client ID when connected
  const connectionBadge = (
    <Flex align="center">
      <Badge 
        colorScheme={isConnected ? "green" : "red"} 
        variant="subtle" 
        px={3} 
        py={1} 
        borderRadius="md"
      >
        {isConnected ? `Connected${clientId ? ` (${clientId.substring(0, 8)}...)` : ''}` : "Offline"}
      </Badge>
      <Tooltip label="Reconnect WebSocket" placement="top">
        <IconButton
          icon={<RepeatIcon />}
          size="sm"
          ml={2}
          colorScheme="blue"
          variant="ghost"
          isDisabled={isConnected}
          onClick={handleReconnect}
          aria-label="Reconnect WebSocket"
        />
      </Tooltip>
    </Flex>
  );

  return (
    <Container maxW="container.xl" py={8}>
      {/* Network Stats Section */}
      <Box mb={8}>
        <Flex justifyContent="space-between" alignItems="center" mb={6}>
          <Heading as="h2" size="lg">
            Supereum Network Stats
          </Heading>
          {connectionBadge}
        </Flex>
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6}>
          <Skeleton isLoaded={!isLoading}>
            <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
              <StatLabel>Current Block</StatLabel>
              <StatNumber>{networkStats?.blockNumber || 0}</StatNumber>
              <StatHelpText>Latest block height</StatHelpText>
            </Stat>
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
              <StatLabel>Transactions</StatLabel>
              <StatNumber>{networkStats?.total_transactions?.toLocaleString() || 0}</StatNumber>
              <StatHelpText>Total processed</StatHelpText>
            </Stat>
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
              <StatLabel>Validators</StatLabel>
              <StatNumber>{networkStats?.active_validators || 0}</StatNumber>
              <StatHelpText>Active validators</StatHelpText>
            </Stat>
          </Skeleton>
          <Skeleton isLoaded={!isLoading}>
            <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
              <StatLabel>Average Block Time</StatLabel>
              <StatNumber>{typeof networkStats?.average_block_time === 'number' ? networkStats.average_block_time.toFixed(2) : '0'}s</StatNumber>
              <StatHelpText>Last 100 blocks</StatHelpText>
            </Stat>
          </Skeleton>
        </SimpleGrid>
      </Box>

      <Divider my={8} />

      {/* Latest Blocks and Transactions */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
        {/* Latest Blocks */}
        <Box>
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading as="h2" size="md">
              Latest Blocks
            </Heading>
            <Button as={RouterLink} to="/blocks" size="sm" rightIcon={<ChevronRightIcon />} colorScheme="blue" variant="ghost">
              View All
            </Button>
          </Flex>
          <Stack spacing={4}>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} height="100px" />
              ))
            ) : Array.isArray(latestBlocks) && latestBlocks.length > 0 ? (
              latestBlocks.map((block, index) => (
                <BlockCard key={block.hash || block.number || index} block={block} isCompact={true} />
              ))
            ) : (
              <Text>No blocks found</Text>
            )}
          </Stack>
        </Box>

        {/* Latest Transactions */}
        <Box>
          <Flex justifyContent="space-between" alignItems="center" mb={4}>
            <Heading as="h2" size="md">
              Latest Transactions
            </Heading>
            <Button as={RouterLink} to="/transactions" size="sm" rightIcon={<ChevronRightIcon />} colorScheme="blue" variant="ghost">
              View All
            </Button>
          </Flex>
          <Stack spacing={4}>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} height="100px" />
              ))
            ) : Array.isArray(latestTransactions) && latestTransactions.length > 0 ? (
              latestTransactions.map((tx, index) => (
                <TransactionCard key={tx.hash || index} transaction={tx} isCompact={true} />
              ))
            ) : (
              <Text>No transactions found</Text>
            )}
          </Stack>
        </Box>
      </SimpleGrid>
    </Container>
  );
} 