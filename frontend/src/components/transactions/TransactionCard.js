import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Text,
  Link,
  Badge,
  HStack,
  Tooltip,
  IconButton,
  useColorModeValue,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { format } from 'timeago.js';

const TransactionCard = ({ transaction, isCompact = false }) => {
  // Guard against undefined transaction
  if (!transaction || typeof transaction !== 'object') {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" opacity={0.7}>
        <Text>Invalid transaction data</Text>
      </Box>
    );
  }

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  
  // Handle different timestamp formats
  const timestamp = typeof transaction.timestamp === 'number' 
    ? new Date(transaction.timestamp * 1000) 
    : transaction.timestamp ? new Date(transaction.timestamp) : new Date();
  
  // Safely get values with fallbacks
  const txHash = transaction.hash || '';
  const txFrom = transaction.from || '';
  const txTo = transaction.to || '';
  const txStatus = transaction.status || 'Unknown';
  const txValue = transaction.value || '0';
  const txBlockNumber = transaction.blockNumber;
  const txBlockHash = transaction.blockHash;
  
  // Format the value if it's in wei (convert to ETH equivalent)
  const formatValue = (value) => {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return '0 SUP';
      const valueInEth = numValue / 1e18;
      return `${valueInEth.toFixed(6)} SUP`;
    } catch (e) {
      return '0 SUP';
    }
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
  
  return (
    <Box
      p={4}
      bg={bgColor}
      borderWidth="1px"
      borderRadius="lg"
      borderColor={borderColor}
      boxShadow="sm"
      transition="all 0.2s"
      _hover={{ boxShadow: 'md', bg: hoverBg }}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <HStack>
          <Badge colorScheme={getStatusColor(txStatus)} mr={2}>
            {txStatus}
          </Badge>
          {txHash ? (
            <Link
              as={RouterLink}
              to={`/tx/${txHash}`}
              fontWeight="bold"
              color="blue.500"
            >
              {isCompact 
                ? `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}` 
                : txHash}
            </Link>
          ) : (
            <Text color="gray.500">Unknown Hash</Text>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {format(timestamp)}
        </Text>
      </Flex>

      <Flex justifyContent="space-between" alignItems="center" fontSize="sm">
        <HStack>
          <Text fontWeight="semibold">From:</Text>
          {txFrom ? (
            <Link as={RouterLink} to={`/address/${txFrom}`} color="blue.500">
              {txFrom.substring(0, 6)}...{txFrom.substring(txFrom.length - 4)}
            </Link>
          ) : (
            <Text>Unknown</Text>
          )}
        </HStack>
        
        <HStack>
          <Text fontWeight="semibold">To:</Text>
          {txTo ? (
            <Link as={RouterLink} to={`/address/${txTo}`} color="blue.500">
              {txTo.substring(0, 6)}...{txTo.substring(txTo.length - 4)}
            </Link>
          ) : (
            <Badge colorScheme="purple">Contract Creation</Badge>
          )}
        </HStack>
      </Flex>

      {!isCompact && (
        <HStack mt={2} fontSize="sm">
          <Text fontWeight="semibold">Block:</Text>
          {txBlockNumber ? (
            <Link as={RouterLink} to={`/block/${txBlockHash || txBlockNumber}`} color="blue.500">
              {txBlockNumber}
            </Link>
          ) : (
            <Badge colorScheme="yellow">Pending</Badge>
          )}
        </HStack>
      )}

      <Flex mt={3} justifyContent="space-between" fontSize="sm">
        <HStack>
          <Text fontWeight="semibold">Value:</Text>
          <Text>{formatValue(txValue)}</Text>
        </HStack>
        
        {!isCompact && (
          <HStack>
            <Text fontWeight="semibold">Gas Used:</Text>
            <Text>{transaction.gasUsed || 'N/A'}</Text>
          </HStack>
        )}
        
        <HStack>
          <Text fontWeight="semibold">Fee:</Text>
          <Text>{transaction.fee ? formatValue(transaction.fee) : 'N/A'}</Text>
        </HStack>
      </Flex>
    </Box>
  );
};

export default TransactionCard; 