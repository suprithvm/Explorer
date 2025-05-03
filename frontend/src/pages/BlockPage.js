import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Divider,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  VStack,
  Skeleton,
  useColorModeValue,
  Link,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { getBlockByIdentifier, getBlockTransactions } from '../services/api';
import TransactionCard from '../components/transactions/TransactionCard';

export default function BlockPage() {
  const { identifier } = useParams();
  const [block, setBlock] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchBlockData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const blockData = await getBlockByIdentifier(identifier);
        setBlock(blockData);
        
        const txData = await getBlockTransactions(identifier, page, 10);
        setTransactions(txData.data);
        setHasMore(txData.pagination.hasNext);
      } catch (err) {
        console.error('Error fetching block details:', err);
        setError('Failed to load block details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBlockData();
  }, [identifier, page]);

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp);
    return date.toLocaleString();
  };

  // Navigate to previous/next block
  const navigateToBlock = (direction) => {
    if (!block) return;
    
    const targetBlockNumber = direction === 'prev' 
      ? block.number - 1 
      : block.number + 1;
      
    if (targetBlockNumber < 0) return;
    window.location.href = `/block/${targetBlockNumber}`;
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Skeleton height="50px" mb={4} />
        <Skeleton height="200px" mb={8} />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  if (!block) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          Block not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Block #{block.number}
        </Heading>
        <HStack>
          <Button 
            leftIcon={<ChevronLeftIcon />} 
            onClick={() => navigateToBlock('prev')} 
            isDisabled={block.number <= 0}
          >
            Previous
          </Button>
          <Button 
            rightIcon={<ChevronRightIcon />} 
            onClick={() => navigateToBlock('next')}
          >
            Next
          </Button>
        </HStack>
      </Flex>

      <Box 
        bg={bgColor} 
        borderRadius="lg" 
        borderWidth="1px" 
        borderColor={borderColor} 
        boxShadow="sm" 
        p={6} 
        mb={8}
      >
        <VStack align="stretch" spacing={4}>
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Block Hash:</Text>
            <Text>{block.hash}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Parent Hash:</Text>
            <Link as={RouterLink} to={`/block/${block.parentHash}`} color="blue.500">
              {block.parentHash}
            </Link>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Timestamp:</Text>
            <Text>{formatDate(block.timestamp)}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Miner:</Text>
            <Link as={RouterLink} to={`/address/${block.miner}`} color="blue.500">
              {block.miner}
            </Link>
          </Flex>
          <Divider />
          
          {block.validator && (
            <>
              <Flex justify="space-between">
                <Text fontWeight="bold" width="200px">Validator:</Text>
                <Link as={RouterLink} to={`/address/${block.validator}`} color="blue.500">
                  {block.validator}
                </Link>
              </Flex>
              <Divider />
            </>
          )}
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Difficulty:</Text>
            <Text>{block.difficulty}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Gas Used:</Text>
            <Text>{block.gasUsed}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Gas Limit:</Text>
            <Text>{block.gasLimit}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Size:</Text>
            <Text>{block.size} bytes</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Extra Data:</Text>
            <Text fontFamily="monospace" fontSize="sm">
              {block.extraData ? block.extraData : 'N/A'}
            </Text>
          </Flex>
        </VStack>
      </Box>

      <Tabs isFitted variant="enclosed" mb={8}>
        <TabList>
          <Tab>Transactions ({block.txCount || (block.transactions ? block.transactions.length : 0)})</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel p={4}>
            {transactions.length > 0 ? (
              <>
                <VStack spacing={4} align="stretch">
                  {transactions.map(tx => (
                    <TransactionCard key={tx.hash} transaction={tx} />
                  ))}
                </VStack>
                
                <Flex justify="center" mt={6}>
                  <HStack>
                    <Button 
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                      isDisabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Text>Page {page}</Text>
                    <Button 
                      onClick={() => setPage(prev => prev + 1)} 
                      isDisabled={!hasMore}
                    >
                      Next
                    </Button>
                  </HStack>
                </Flex>
              </>
            ) : (
              <Box textAlign="center" py={8}>
                <Text>No transactions in this block</Text>
              </Box>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
} 