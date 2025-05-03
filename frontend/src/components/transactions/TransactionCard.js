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
  Icon,
  VStack,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { ExternalLinkIcon, TimeIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { FaExchangeAlt, FaArrowRight, FaCube, FaGasPump, FaCoins, FaLongArrowAltRight } from 'react-icons/fa';
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
  const addressBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const timeColor = useColorModeValue('gray.500', 'gray.400');
  const accentColor = useColorModeValue('cyan.500', 'cyan.400');
  
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
  const direction = transaction.direction || '';
  
  // Format the value if it's in wei (convert to ETH equivalent)
  const formatValue = (value) => {
    try {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return '0 SUP';
      // Supereum amounts are already in the native units, no need to divide by 1e18
      return `${numValue.toFixed(6)} SUP`;
    } catch (e) {
      return '0 SUP';
    }
  };
  
  // Determine transaction status color
  const getStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'success':
      case 'confirmed':
        return 'teal';
      case 'pending':
        return 'orange';
      case 'failed':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Create status-based gradient
  const statusColor = getStatusColor(txStatus);
  const statusGradient = useColorModeValue(
    `linear(to-r, gray.700, ${statusColor}.900)`,
    `linear(to-r, gray.700, ${statusColor}.900)`
  );
  
  const getStatusTextColor = (status) => {
    switch(status.toLowerCase()) {
      case 'success':
      case 'confirmed':
        return 'teal.200';
      case 'pending':
        return 'orange.200';
      case 'failed':
        return 'red.200';
      default:
        return 'gray.200';
    }
  };
  
  const statusTextColor = getStatusTextColor(txStatus);
  
  return (
    <Box
      position="relative"
      bg={bgColor}
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      transition="all 0.3s"
      _hover={{ 
        transform: 'translateY(-4px)',
        boxShadow: 'xl',
      }}
    >
      {/* Transaction header with gradient background */}
      <Box 
        bgGradient={statusGradient}
        color="white"
        py={3}
        px={4}
      >
        <Flex justify="space-between" align="center">
          <HStack spacing={4}>
            <Box 
              bg="rgba(255,255,255,0.15)" 
              borderRadius="full" 
              p={2}
              boxShadow="0 0 10px rgba(0,0,0,0.2)"
            >
              <Icon as={FaExchangeAlt} boxSize="20px" color={statusTextColor} />
            </Box>
            <Tooltip label="View transaction details">
              <Link
                as={RouterLink}
                to={`/tx/${txHash}`}
                fontWeight="bold"
                fontSize="lg"
                color="white"
                _hover={{ textDecoration: 'none', transform: 'scale(1.05)', color: statusTextColor }}
                transition="transform 0.2s, color 0.2s"
              >
                {isCompact 
                  ? `${txHash.substring(0, 8)}...${txHash.substring(txHash.length - 8)}` 
                  : `${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 10)}`}
              </Link>
            </Tooltip>
          </HStack>

          <HStack spacing={2}>
            <Badge
              colorScheme={statusColor}
              variant="solid"
              py={1}
              px={3}
              borderRadius="full"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="0.5px"
              fontWeight="bold"
              bg="rgba(0,0,0,0.3)"
              color={statusTextColor}
            >
              {txStatus}
            </Badge>
            <HStack spacing={1} fontSize="sm" opacity={0.9}>
              <TimeIcon boxSize="12px" />
              <Text>{format(timestamp)}</Text>
            </HStack>
          </HStack>
        </Flex>
      </Box>
      
      <Box p={4}>
        {/* Transaction Flow */}
        <Box
          bg={addressBg}
          borderRadius="lg"
          p={4}
          mb={4}
          position="relative"
          boxShadow="sm"
        >
          {/* From Address */}
          <Flex mb={8} align="center">
            <VStack align="flex-start" flex="0 0 100px">
              <Text fontSize="xs" fontWeight="bold" color={textColor} textTransform="uppercase" letterSpacing="wide">From</Text>
              {direction === 'out' && (
                <Badge colorScheme="orange" variant="subtle">YOU</Badge>
              )}
            </VStack>
            
            <Box 
              flex="1" 
              bg={bgColor} 
              p={3} 
              borderRadius="md"
              boxShadow="sm"
            >
              {txFrom ? (
                <Flex align="center" justify="space-between">
                  <Link 
                    as={RouterLink} 
                    to={`/address/${txFrom}`} 
                    color={accentColor}
                    fontFamily="mono"
                    fontSize="sm"
                    isTruncated
                    maxW="80%"
                  >
                    {txFrom}
                  </Link>
                  <IconButton
                    as={RouterLink}
                    to={`/address/${txFrom}`}
                    icon={<ChevronRightIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    aria-label="View address"
                  />
                </Flex>
              ) : (
                <Text fontSize="sm">Unknown</Text>
              )}
            </Box>
          </Flex>
          
          {/* Arrow */}
          <Box position="absolute" left="50%" top="50%" transform="translate(-50%, -50%)">
            <Flex
              direction="column"
              align="center"
              justify="center"
              bg={bgColor}
              boxSize="40px"
              borderRadius="full"
              boxShadow="md"
            >
              <Icon as={FaArrowRight} color={accentColor} boxSize="20px" />
            </Flex>
          </Box>
          
          {/* To Address */}
          <Flex align="center">
            <VStack align="flex-start" flex="0 0 100px">
              <Text fontSize="xs" fontWeight="bold" color={textColor} textTransform="uppercase" letterSpacing="wide">To</Text>
              {direction === 'in' && (
                <Badge colorScheme="green" variant="subtle">YOU</Badge>
              )}
            </VStack>
            
            <Box 
              flex="1" 
              bg={bgColor} 
              p={3} 
              borderRadius="md"
              boxShadow="sm"
            >
              {txTo ? (
                <Flex align="center" justify="space-between">
                  <Link 
                    as={RouterLink} 
                    to={`/address/${txTo}`} 
                    color={accentColor}
                    fontFamily="mono"
                    fontSize="sm"
                    isTruncated
                    maxW="80%"
                  >
                    {txTo}
                  </Link>
                  <IconButton
                    as={RouterLink}
                    to={`/address/${txTo}`}
                    icon={<ChevronRightIcon />}
                    size="sm"
                    variant="ghost"
                    colorScheme="blue"
                    aria-label="View address"
                  />
                </Flex>
              ) : (
                <Badge colorScheme="purple" variant="subtle">Contract Creation</Badge>
              )}
            </Box>
          </Flex>
        </Box>

        {/* Transaction Details */}
        <Grid
          templateColumns={{ base: "1fr", md: !isCompact ? "1fr 1fr" : "1fr" }}
          gap={4}
        >
          {/* Transaction Value */}
          <GridItem>
            <Stat
              bg={addressBg}
              p={3}
              borderRadius="lg"
              boxShadow="sm"
            >
              <Flex align="center">
                <Icon as={FaCoins} color={accentColor} mr={2} />
                <StatLabel fontSize="xs" fontWeight="bold" textTransform="uppercase">Value</StatLabel>
              </Flex>
              <StatNumber fontSize="lg" mt={1} fontWeight="bold">
                {formatValue(txValue)}
              </StatNumber>
            </Stat>
          </GridItem>
          
          {/* Additional Info */}
          {!isCompact && (
            <GridItem>
              <Grid templateColumns="repeat(2, 1fr)" gap={2} h="100%">
                {/* Block Info */}
                {txBlockNumber && (
                  <GridItem>
                    <Box bg={addressBg} p={3} borderRadius="lg" boxShadow="sm" h="100%">
                      <Flex align="center" mb={1}>
                        <Icon as={FaCube} color={accentColor} mr={2} size="sm" />
                        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">Block</Text>
                      </Flex>
                      <Link 
                        as={RouterLink} 
                        to={`/block/${txBlockHash || txBlockNumber}`} 
                        color={accentColor}
                        fontWeight="bold"
                        fontSize="md"
                      >
                        #{txBlockNumber}
                      </Link>
                    </Box>
                  </GridItem>
                )}
                
                {/* Gas Info */}
                {transaction.gasUsed && (
                  <GridItem>
                    <Box bg={addressBg} p={3} borderRadius="lg" boxShadow="sm" h="100%">
                      <Flex align="center" mb={1}>
                        <Icon as={FaGasPump} color={accentColor} mr={2} size="sm" />
                        <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">Gas</Text>
                      </Flex>
                      <Text fontWeight="bold" fontSize="md">
                        {transaction.gasUsed}
                      </Text>
                    </Box>
                  </GridItem>
                )}
                
                {/* Fee Info */}
                {transaction.fee && (
                  <GridItem colSpan={transaction.gasUsed ? 1 : 2}>
                    <Box bg={addressBg} p={3} borderRadius="lg" boxShadow="sm" h="100%">
                      <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" mb={1}>Fee</Text>
                      <Text fontWeight="bold" fontSize="md">
                        {transaction.fee ? formatValue(transaction.fee) : 'N/A'}
                      </Text>
                    </Box>
                  </GridItem>
                )}
              </Grid>
            </GridItem>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default TransactionCard; 