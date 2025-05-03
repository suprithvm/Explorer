import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  Text,
  Link,
  Badge,
  HStack,
  IconButton,
  Tooltip,
  useColorModeValue,
  Icon,
  VStack,
  Spacer,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { ExternalLinkIcon, ChevronRightIcon, TimeIcon } from '@chakra-ui/icons';
import { format } from 'timeago.js';
import { FaCube, FaUserCircle, FaEthereum, FaHammer, FaCheckCircle, FaServer } from 'react-icons/fa';

const BlockCard = ({ block, isCompact = false }) => {
  // Guard against undefined block
  if (!block || typeof block !== 'object') {
    return (
      <Box p={4} borderWidth="1px" borderRadius="lg" opacity={0.7}>
        <Text>Invalid block data</Text>
      </Box>
    );
  }

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hashBg = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const timeColor = useColorModeValue('gray.500', 'gray.400');
  const accentColor = "cyan.500";
  const gradientBg = useColorModeValue(
    'linear(to-r, gray.700, gray.800)',
    'linear(to-r, gray.700, gray.800)'
  );

  // Handle timestamp - convert from Unix timestamp if needed
  const timestamp = typeof block.timestamp === 'number' 
    ? new Date(block.timestamp * 1000) 
    : block.timestamp ? new Date(block.timestamp) : new Date();
  
  // Safely get values with fallbacks
  const blockNumber = block.number || 0;
  const blockHash = block.hash || '';
  const miner = block.miner || block.minedBy || '';
  const validator = block.validator || block.validatedBy || '';
  const parentHash = block.parentHash || '';
  const txCount = block.txCount || (block.transactions ? block.transactions.length : 0);
  
  // Supereum blocks are always hybrid (PoW+PoS)
  const hasMiner = !!miner;
  const hasValidator = !!validator;
  
  return (
    <Box
      position="relative"
      p={0}
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
      {/* Block number header with gradient background */}
      <Box 
        bgGradient={gradientBg}
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
              <Icon as={FaCube} boxSize="22px" color="cyan.300" />
            </Box>
            <Link
              as={RouterLink}
              to={`/block/${blockNumber}`}
              fontWeight="bold"
              fontSize="xl"
              color="white"
              _hover={{ textDecoration: 'none', transform: 'scale(1.05)', color: 'cyan.200' }}
              transition="transform 0.2s, color 0.2s"
            >
              Block #{blockNumber}
            </Link>
          </HStack>

          <HStack spacing={2}>
            <Badge
              colorScheme="cyan"
              variant="solid"
              py={1}
              px={3}
              borderRadius="full"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="0.5px"
              fontWeight="bold"
              bg="rgba(0,0,0,0.3)"
              color="cyan.200"
            >
              Hybrid PoW/PoS
            </Badge>
          </HStack>
        </Flex>
      </Box>
      
      <Box p={4}>
        {/* Timestamp and transaction count */}
        <Flex justify="space-between" align="center" mb={4}>
          <HStack spacing={2}>
            <TimeIcon color={timeColor} />
            <Text fontSize="sm" color={timeColor} fontWeight="medium">
              {format(timestamp)}
            </Text>
          </HStack>
          
          <Tooltip label="Number of transactions" placement="top">
            <Badge 
              colorScheme="cyan" 
              variant="subtle"
              borderRadius="full"
              px={3}
              py={1}
              display="flex"
              alignItems="center"
              gap={1}
              bg="rgba(0,0,0,0.1)"
            >
              <Icon as={FaServer} size="xs" color="cyan.500" />
              <Text>{txCount} transactions</Text>
            </Badge>
          </Tooltip>
        </Flex>

        {/* Block hash info */}
        {!isCompact && (
          <>
            <VStack spacing={3} align="stretch" mb={4}>
              <Tooltip label="Block hash" placement="top">
                <Flex 
                  bg={hashBg} 
                  p={3} 
                  borderRadius="lg" 
                  align="center"
                  boxShadow="sm"
                  _hover={{ bg: useColorModeValue('gray.100', 'gray.650') }}
                  transition="background 0.2s"
                  borderWidth="1px"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                >
                  <Text 
                    fontWeight="bold" 
                    color={textColor} 
                    fontSize="xs"
                    textTransform="uppercase"
                    letterSpacing="1px"
                    w="50px"
                  >
                    Hash:
                  </Text>
                  <Text 
                    isTruncated 
                    fontFamily="mono"
                    fontSize="sm"
                    pl={2}
                    flex="1"
                  >
                    {blockHash || 'N/A'}
                  </Text>
                  {blockHash && (
                    <IconButton
                      as={RouterLink}
                      to={`/block/${blockHash}`}
                      icon={<ChevronRightIcon />}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                      aria-label="View Block"
                      ml={2}
                    />
                  )}
                </Flex>
              </Tooltip>

              {parentHash && (
                <Tooltip label="Parent block hash" placement="top">
                  <Flex 
                    bg={hashBg} 
                    p={3} 
                    borderRadius="lg" 
                    align="center"
                    boxShadow="sm"
                    _hover={{ bg: useColorModeValue('gray.100', 'gray.650') }}
                    transition="background 0.2s"
                    borderWidth="1px"
                    borderColor={useColorModeValue('gray.200', 'gray.600')}
                  >
                    <Text 
                      fontWeight="bold" 
                      color={textColor} 
                      fontSize="xs"
                      textTransform="uppercase"
                      letterSpacing="1px"
                      w="50px"
                    >
                      Parent:
                    </Text>
                    <Text 
                      isTruncated 
                      fontFamily="mono"
                      fontSize="sm"
                      pl={2}
                      flex="1"
                    >
                      {parentHash}
                    </Text>
                    <IconButton
                      as={RouterLink}
                      to={`/block/${parentHash}`}
                      icon={<ChevronRightIcon />}
                      size="sm"
                      variant="ghost"
                      colorScheme="blue"
                      aria-label="View Parent Block"
                      ml={2}
                    />
                  </Flex>
                </Tooltip>
              )}
            </VStack>
          </>
        )}

        {/* Miner and validator info */}
        <Flex 
          bg={useColorModeValue('gray.50', 'gray.750')} 
          p={4} 
          borderRadius="lg"
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align={{ base: "stretch", md: "center" }}
          gap={3}
          boxShadow="sm"
          borderWidth="1px"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
        >
          <HStack spacing={4}>
            <Tooltip label="Block miner" placement="top">
              <Flex direction="column" align="center">
                <Icon 
                  as={FaHammer} 
                  color="orange.400" 
                  boxSize="20px" 
                  mb={1}
                />
                <Text 
                  fontSize="xs" 
                  fontWeight="semibold" 
                  color={textColor}
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Miner
                </Text>
                {hasMiner ? (
                  <Link 
                    as={RouterLink} 
                    to={`/address/${miner}`} 
                    color="cyan.500"
                    fontSize="sm"
                    fontFamily="mono"
                    mt={1}
                    _hover={{ color: 'cyan.600', textDecoration: "underline" }}
                  >
                    {`${miner.substring(0, 6)}...${miner.substring(miner.length - 4)}`}
                  </Link>
                ) : (
                  <Text fontSize="sm" color={textColor} mt={1}>Not available</Text>
                )}
              </Flex>
            </Tooltip>
            
            <Tooltip label="Block validator" placement="top">
              <Flex direction="column" align="center">
                <Icon 
                  as={FaCheckCircle} 
                  color="green.400" 
                  boxSize="20px" 
                  mb={1}
                />
                <Text 
                  fontSize="xs" 
                  fontWeight="semibold" 
                  color={textColor}
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  Validator
                </Text>
                {hasValidator ? (
                  <Link 
                    as={RouterLink} 
                    to={`/address/${validator}`} 
                    color="cyan.500"
                    fontSize="sm"
                    fontFamily="mono"
                    mt={1}
                    _hover={{ color: 'cyan.600', textDecoration: "underline" }}
                  >
                    {`${validator.substring(0, 6)}...${validator.substring(validator.length - 4)}`}
                  </Link>
                ) : (
                  <Text fontSize="sm" color={textColor} mt={1}>Not available</Text>
                )}
              </Flex>
            </Tooltip>
          </HStack>

          {!isCompact && (
            <Grid 
              templateColumns="repeat(3, 1fr)" 
              gap={4}
              p={3}
              borderRadius="md"
              boxShadow="inner"
              w={{ base: "full", md: "auto" }}
              bg={useColorModeValue('rgba(255,255,255,0.8)', 'rgba(30,30,30,0.5)')}
            >
              <GridItem>
                <Flex direction="column" align="center">
                  <Text fontSize="xs" color={textColor} fontWeight="bold">SIZE</Text>
                  <Text fontSize="sm" fontWeight="medium">{block.size || 'N/A'}</Text>
                </Flex>
              </GridItem>
              <GridItem>
                <Flex direction="column" align="center">
                  <Text fontSize="xs" color={textColor} fontWeight="bold">DIFFICULTY</Text>
                  <Text fontSize="sm" fontWeight="medium">{block.difficulty ? (parseInt(block.difficulty) / 1000000).toFixed(2) + 'M' : 'N/A'}</Text>
                </Flex>
              </GridItem>
              <GridItem>
                <Flex direction="column" align="center">
                  <Text fontSize="xs" color={textColor} fontWeight="bold">GAS USED</Text>
                  <Text fontSize="sm" fontWeight="medium">{block.gasUsed ? parseInt(block.gasUsed).toLocaleString() : 'N/A'}</Text>
                </Flex>
              </GridItem>
            </Grid>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default BlockCard; 