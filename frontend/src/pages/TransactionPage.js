import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Divider,
  Badge,
  HStack,
  VStack,
  Skeleton,
  Link,
  useColorModeValue,
  Alert,
  AlertIcon,
  Code,
} from '@chakra-ui/react';
import { getTransactionByHash } from '../services/api';

export default function TransactionPage() {
  const { hash } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchTransactionData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const txData = await getTransactionByHash(hash);
        setTransaction(txData);
      } catch (err) {
        console.error('Error fetching transaction details:', err);
        setError('Failed to load transaction details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactionData();
  }, [hash]);

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp);
    return date.toLocaleString();
  };

  // Format the value (wei to ETH)
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    const valueInEth = parseFloat(value) / 1e18;
    return `${valueInEth.toFixed(8)} SUP`;
  };

  // Determine transaction status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'success':
      case 'confirmed':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Skeleton height="50px" mb={4} />
        <Skeleton height="200px" mb={4} />
        <Skeleton height="300px" />
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

  if (!transaction) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          Transaction not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="lg" mb={6}>
        Transaction Details
      </Heading>

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
          <Flex justify="space-between" align="center">
            <Text fontWeight="bold" width="200px">Transaction Hash:</Text>
            <Text wordBreak="break-all">{transaction.hash}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between" align="center">
            <Text fontWeight="bold" width="200px">Status:</Text>
            <Badge colorScheme={getStatusColor(transaction.status)}>
              {transaction.status || 'Unknown'}
            </Badge>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Block:</Text>
            {transaction.blockNumber ? (
              <Link as={RouterLink} to={`/block/${transaction.blockHash}`} color="blue.500">
                {transaction.blockNumber}
              </Link>
            ) : (
              <Badge colorScheme="yellow">Pending</Badge>
            )}
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Timestamp:</Text>
            <Text>{formatDate(transaction.timestamp)}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">From:</Text>
            <Link as={RouterLink} to={`/address/${transaction.from}`} color="blue.500">
              {transaction.from}
            </Link>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">To:</Text>
            {transaction.to ? (
              <Link as={RouterLink} to={`/address/${transaction.to}`} color="blue.500">
                {transaction.to}
              </Link>
            ) : (
              <Badge colorScheme="purple">Contract Creation</Badge>
            )}
          </Flex>
          <Divider />
          
          {transaction.contractAddress && (
            <>
              <Flex justify="space-between">
                <Text fontWeight="bold" width="200px">Contract Created:</Text>
                <Link as={RouterLink} to={`/address/${transaction.contractAddress}`} color="blue.500">
                  {transaction.contractAddress}
                </Link>
              </Flex>
              <Divider />
            </>
          )}
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Value:</Text>
            <Text>{formatValue(transaction.value)}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Transaction Fee:</Text>
            <Text>{transaction.fee ? formatValue(transaction.fee) : 'N/A'}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Gas Price:</Text>
            <Text>{transaction.gasPrice ? `${(parseInt(transaction.gasPrice) / 1e9).toFixed(2)} Gwei` : 'N/A'}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Gas Limit:</Text>
            <Text>{transaction.gas || 'N/A'}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Gas Used:</Text>
            <Text>{transaction.gasUsed || 'N/A'}</Text>
          </Flex>
          <Divider />
          
          <Flex justify="space-between">
            <Text fontWeight="bold" width="200px">Nonce:</Text>
            <Text>{transaction.nonce}</Text>
          </Flex>
          
          {transaction.input && transaction.input !== '0x' && (
            <>
              <Divider />
              <Box>
                <Text fontWeight="bold" mb={2}>Input Data:</Text>
                <Code p={4} borderRadius="md" w="100%" overflow="auto" fontSize="sm" whiteSpace="pre-wrap">
                  {transaction.input}
                </Code>
              </Box>
            </>
          )}
        </VStack>
      </Box>
    </Container>
  );
} 