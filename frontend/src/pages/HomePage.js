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
  Icon,
  HStack,
  VStack,
  Image,
  keyframes,
  useDisclosure,
  Fade,
} from '@chakra-ui/react';
import { 
  ChevronRightIcon, 
  RepeatIcon, 
  TimeIcon,
  ExternalLinkIcon
} from '@chakra-ui/icons';
import { 
  FaCube, 
  FaServer, 
  FaExchangeAlt, 
  FaUserFriends, 
  FaClock, 
  FaBroadcastTower 
} from 'react-icons/fa';
import { useWebSocket } from '../contexts/WebSocketContext';
import BlockCard from '../components/blocks/BlockCard';
import TransactionCard from '../components/transactions/TransactionCard';
import { getLatestBlocks, getLatestTransactions, getNetworkStats } from '../services/api';

// Define animation keyframes
const pulse = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

const slideIn = keyframes`
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export default function HomePage() {
  const [latestBlocks, setLatestBlocks] = useState([]);
  const [latestTransactions, setLatestTransactions] = useState([]);
  const [networkStats, setNetworkStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastDataFetch, setLastDataFetch] = useState(null);
  const { lastBlock, lastTransaction, isConnected, clientId, reconnect } = useWebSocket();
  const { isOpen: isNewBlockOpen, onOpen: onNewBlockOpen, onClose: onNewBlockClose } = useDisclosure();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.750');
  const accentColor = useColorModeValue('brand.500', 'brand.400');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const statCardBg = useColorModeValue('white', 'gray.800');
  const statBorder = useColorModeValue('gray.100', 'gray.700');
  const pulseAnimation = `${pulse} 2s infinite ease-in-out`;
  const slideInAnimation = `${slideIn} 0.5s ease-out forwards`;

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
        onNewBlockOpen();
        setTimeout(onNewBlockClose, 2000);
        
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
  }, [lastBlock, latestBlocks, onNewBlockOpen, onNewBlockClose]);

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
      <HStack 
        spacing={2} 
        bg={isConnected ? 'green.50' : 'red.50'} 
        _dark={{bg: isConnected ? 'rgba(72, 187, 120, 0.2)' : 'rgba(245, 101, 101, 0.2)'}}
        color={isConnected ? 'green.500' : 'red.500'}
        px={3} 
        py={2} 
        borderRadius="lg"
        borderWidth="1px"
        borderColor={isConnected ? 'green.100' : 'red.100'}
        _dark={{borderColor: isConnected ? 'green.800' : 'red.800'}}
      >
        <Icon 
          as={isConnected ? FaBroadcastTower : RepeatIcon} 
          animation={isConnected ? pulseAnimation : undefined}
        />
        <Text fontWeight="medium" fontSize="sm">
          {isConnected ? `Connected${clientId ? ` (${clientId.substring(0, 8)}...)` : ''}` : "Disconnected"}
        </Text>
      </HStack>
      
      {!isConnected && (
        <Tooltip label="Reconnect WebSocket" placement="top" hasArrow>
          <IconButton
            icon={<RepeatIcon />}
            size="sm"
            ml={2}
            colorScheme="blue"
            variant="outline"
            onClick={handleReconnect}
            aria-label="Reconnect WebSocket"
          />
        </Tooltip>
      )}
    </Flex>
  );

  return (
    <Box>
      {/* Hero Section */}
      <Box 
        py={12} 
        bg={useColorModeValue('gray.50', 'gray.900')}
        position="relative"
        overflow="hidden"
      >
        {/* Background Pattern */}
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg={useColorModeValue(
            "url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a0aec0' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            "url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a0aec0' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"
          )}
          opacity={0.6}
        />
      
        <Container maxW="container.xl" position="relative">
          <VStack spacing={3} align="center" mb={10}>
            <Heading 
              as="h1" 
              size="2xl" 
              bgGradient="linear(to-r, brand.500, secondary.500)"
              bgClip="text"
              fontWeight="bold"
              textAlign="center"
            >
              Supereum Blockchain Explorer
            </Heading>
            <Text 
              fontSize="xl" 
              color={muted} 
              maxW="800px" 
              textAlign="center"
            >
              Explore blocks, transactions, and addresses on the Supereum blockchain
            </Text>
          </VStack>
          
          {/* Connection Status */}
          <Flex justify="center" mb={8}>
            {connectionBadge}
          </Flex>
        
          {/* Network Stats Cards */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8} mb={12}>
            <Stat
              p={6}
              bg={statCardBg}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={statBorder}
              boxShadow="lg"
              position="relative"
              overflow="hidden"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-5px)', boxShadow: 'xl' }}
            >
              <Box 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                h="5px" 
                bgGradient="linear(to-r, brand.400, brand.600)" 
              />
              <Icon as={FaCube} boxSize="24px" color="brand.500" mb={2} />
              <StatLabel fontSize="lg" fontWeight="medium">Current Block</StatLabel>
              <Skeleton isLoaded={!isLoading} startColor="brand.50" endColor="brand.200">
                <StatNumber fontSize="3xl" fontWeight="bold">
                  {networkStats?.blockNumber || 0}
                </StatNumber>
              </Skeleton>
              <StatHelpText>Latest block height</StatHelpText>
            </Stat>
              
            <Stat
              p={6}
              bg={statCardBg}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={statBorder}
              boxShadow="lg"
              position="relative"
              overflow="hidden"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-5px)', boxShadow: 'xl' }}
            >
              <Box 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                h="5px" 
                bgGradient="linear(to-r, blue.400, purple.600)" 
              />
              <Icon as={FaExchangeAlt} boxSize="24px" color="blue.500" mb={2} />
              <StatLabel fontSize="lg" fontWeight="medium">Transactions</StatLabel>
              <Skeleton isLoaded={!isLoading} startColor="blue.50" endColor="blue.200">
                <StatNumber fontSize="3xl" fontWeight="bold">
                  {networkStats?.total_transactions?.toLocaleString() || 0}
                </StatNumber>
              </Skeleton>
              <StatHelpText>Total processed</StatHelpText>
            </Stat>
              
            <Stat
              p={6}
              bg={statCardBg}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={statBorder}
              boxShadow="lg"
              position="relative"
              overflow="hidden"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-5px)', boxShadow: 'xl' }}
            >
              <Box 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                h="5px" 
                bgGradient="linear(to-r, green.400, teal.600)" 
              />
              <Icon as={FaUserFriends} boxSize="24px" color="green.500" mb={2} />
              <StatLabel fontSize="lg" fontWeight="medium">Validators</StatLabel>
              <Skeleton isLoaded={!isLoading} startColor="green.50" endColor="green.200">
                <StatNumber fontSize="3xl" fontWeight="bold">
                  {networkStats?.active_validators || 0}
                </StatNumber>
              </Skeleton>
              <StatHelpText>Active validators</StatHelpText>
            </Stat>
              
            <Stat
              p={6}
              bg={statCardBg}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={statBorder}
              boxShadow="lg"
              position="relative"
              overflow="hidden"
              transition="all 0.3s"
              _hover={{ transform: 'translateY(-5px)', boxShadow: 'xl' }}
            >
              <Box 
                position="absolute" 
                top={0} 
                left={0} 
                right={0} 
                h="5px" 
                bgGradient="linear(to-r, orange.400, red.600)" 
              />
              <Icon as={FaClock} boxSize="24px" color="orange.500" mb={2} />
              <StatLabel fontSize="lg" fontWeight="medium">Block Time</StatLabel>
              <Skeleton isLoaded={!isLoading} startColor="orange.50" endColor="orange.200">
                <StatNumber fontSize="3xl" fontWeight="bold">
                  {typeof networkStats?.average_block_time === 'number' 
                    ? networkStats.average_block_time.toFixed(2) 
                    : '0'}s
                </StatNumber>
              </Skeleton>
              <StatHelpText>Last 100 blocks</StatHelpText>
            </Stat>
          </SimpleGrid>
        </Container>
      </Box>

      <Container maxW="container.xl" py={12}>
        {/* New Block Notification */}
        <Fade in={isNewBlockOpen}>
          <Box 
            bg="green.100" 
            color="green.800" 
            _dark={{bg: "rgba(72, 187, 120, 0.2)", color: "green.200"}}
            mb={6} 
            p={3} 
            borderRadius="lg"
            textAlign="center"
          >
            <HStack spacing={2} justify="center">
              <Icon as={FaCube} />
              <Text fontWeight="medium">New block received and added to the explorer!</Text>
            </HStack>
          </Box>
        </Fade>

        {/* Latest Blocks and Transactions */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={10}>
          {/* Latest Blocks */}
          <Box>
            <Flex 
              justifyContent="space-between" 
              alignItems="center" 
              mb={6}
              bg={headerBg}
              p={4}
              borderRadius="xl"
              boxShadow="sm"
            >
              <HStack>
                <Icon as={FaCube} color={accentColor} boxSize="20px" />
                <Heading as="h2" size="md">
                  Latest Blocks
                </Heading>
              </HStack>
              <Button 
                as={RouterLink} 
                to="/blocks" 
                size="sm" 
                rightIcon={<ChevronRightIcon />} 
                variant="ghost"
                color={accentColor}
              >
                View All
              </Button>
            </Flex>
            <VStack spacing={6}>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} height="120px" width="100%" borderRadius="xl" />
                ))
              ) : Array.isArray(latestBlocks) && latestBlocks.length > 0 ? (
                latestBlocks.map((block, index) => (
                  <Box 
                    key={block.hash || block.number || index} 
                    width="100%"
                    animation={index === 0 && lastBlock ? slideInAnimation : undefined}
                    opacity={index === 0 && lastBlock ? 0 : 1}
                  >
                    <BlockCard block={block} isCompact={true} />
                  </Box>
                ))
              ) : (
                <Box 
                  p={8} 
                  textAlign="center" 
                  borderWidth="1px" 
                  borderColor={borderColor} 
                  borderRadius="xl"
                >
                  <Text color={muted}>No blocks found</Text>
                </Box>
              )}
            </VStack>
          </Box>

          {/* Latest Transactions */}
          <Box>
            <Flex 
              justifyContent="space-between" 
              alignItems="center" 
              mb={6}
              bg={headerBg}
              p={4}
              borderRadius="xl"
              boxShadow="sm"
            >
              <HStack>
                <Icon as={FaExchangeAlt} color={accentColor} boxSize="20px" />
                <Heading as="h2" size="md">
                  Latest Transactions
                </Heading>
              </HStack>
              <Button 
                as={RouterLink} 
                to="/transactions" 
                size="sm" 
                rightIcon={<ChevronRightIcon />} 
                variant="ghost"
                color={accentColor}
              >
                View All
              </Button>
            </Flex>
            <VStack spacing={6}>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} height="120px" width="100%" borderRadius="xl" />
                ))
              ) : Array.isArray(latestTransactions) && latestTransactions.length > 0 ? (
                latestTransactions.map((tx, index) => (
                  <Box 
                    key={tx.hash || index} 
                    width="100%"
                    animation={index === 0 && lastTransaction ? slideInAnimation : undefined}
                    opacity={index === 0 && lastTransaction ? 0 : 1}
                  >
                    <TransactionCard transaction={tx} />
                  </Box>
                ))
              ) : (
                <Box 
                  p={8} 
                  textAlign="center" 
                  borderWidth="1px" 
                  borderColor={borderColor} 
                  borderRadius="xl"
                >
                  <Text color={muted}>No transactions found</Text>
                </Box>
              )}
            </VStack>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
} 