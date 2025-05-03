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
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  useColorModeValue,
  InputGroup,
  InputLeftElement,
  Input,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@chakra-ui/icons';
import { getLatestBlocks } from '../services/api';
import BlockCard from '../components/blocks/BlockCard';
import { useWebSocket } from '../contexts/WebSocketContext';

export default function BlocksPage() {
  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalBlocks, setTotalBlocks] = useState(0);
  const [searchBlock, setSearchBlock] = useState('');
  
  const { lastBlock } = useWebSocket();

  useEffect(() => {
    const fetchBlocks = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getLatestBlocks(page, limit);
        setBlocks(response.data);
        setTotalBlocks(response.pagination?.total || 0);
        setHasMore(response.pagination?.hasNext || false);
      } catch (err) {
        console.error('Error fetching blocks:', err);
        setError('Failed to load blocks. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBlocks();
  }, [page, limit]);

  // Update blocks list when new block is received via WebSocket
  useEffect(() => {
    if (lastBlock && page === 1) {
      setBlocks(prev => {
        // Check if the block is already in the list
        if (prev.some(block => block.hash === lastBlock.hash)) {
          return prev;
        }
        
        // Add new block to the beginning and remove the last one to maintain the length
        const updated = [lastBlock, ...prev.slice(0, prev.length - 1)];
        return updated;
      });
      
      // Increment total blocks count
      setTotalBlocks(prev => prev + 1);
    }
  }, [lastBlock, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchBlock.trim()) {
      // If it's a number, navigate to block by number
      if (/^\d+$/.test(searchBlock.trim())) {
        window.location.href = `/block/${searchBlock.trim()}`;
      } 
      // If it looks like a hash, navigate to block by hash
      else if (searchBlock.trim().startsWith('0x')) {
        window.location.href = `/block/${searchBlock.trim()}`;
      }
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h1" size="lg">
          Blocks
        </Heading>
        
        <Flex>
          <form onSubmit={handleSearch}>
            <InputGroup size="md" mr={4}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.300" />
              </InputLeftElement>
              <Input
                placeholder="Search by block # or hash"
                value={searchBlock}
                onChange={(e) => setSearchBlock(e.target.value)}
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
              Showing blocks {Math.min(1, (page - 1) * limit + 1)} to {Math.min(page * limit, totalBlocks)} of {totalBlocks} total blocks
            </Text>
          </Box>
          
          <VStack spacing={4} align="stretch" mb={6}>
            {isLoading ? (
              Array(limit).fill(0).map((_, i) => (
                <Skeleton key={i} height="120px" />
              ))
            ) : blocks.length > 0 ? (
              blocks.map(block => (
                <BlockCard key={block.hash} block={block} />
              ))
            ) : (
              <Box textAlign="center" py={8}>
                <Text>No blocks found</Text>
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