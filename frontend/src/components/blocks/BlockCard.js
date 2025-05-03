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
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { format } from 'timeago.js';

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
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  // Handle timestamp - convert from Unix timestamp if needed
  const timestamp = typeof block.timestamp === 'number' 
    ? new Date(block.timestamp * 1000) 
    : block.timestamp ? new Date(block.timestamp) : new Date();
  
  // Safely get values with fallbacks
  const blockNumber = block.number || 0;
  const blockHash = block.hash || '';
  const isPow = !!block.isPow;
  const miner = block.miner || '';
  const validator = block.validator || '';
  const parentHash = block.parentHash || '';
  const txCount = block.txCount || (block.transactions ? block.transactions.length : 0);
  
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
          <Badge colorScheme={isPow ? 'purple' : 'green'} mr={2}>
            {isPow ? 'PoW' : 'PoS'}
          </Badge>
          <Link
            as={RouterLink}
            to={`/block/${blockHash || blockNumber}`}
            fontWeight="bold"
            color="blue.500"
          >
            Block #{blockNumber}
          </Link>
        </HStack>
        <Text fontSize="sm" color="gray.500">
          {format(timestamp)}
        </Text>
      </Flex>

      {!isCompact && (
        <>
          <HStack mb={2} fontSize="sm">
            <Text fontWeight="semibold">Hash:</Text>
            <Text isTruncated maxW="200px">
              {blockHash || 'N/A'}
            </Text>
            {blockHash && (
              <Tooltip label="View Block">
                <IconButton
                  as={RouterLink}
                  to={`/block/${blockHash}`}
                  icon={<ExternalLinkIcon />}
                  size="xs"
                  variant="ghost"
                  aria-label="View Block"
                />
              </Tooltip>
            )}
          </HStack>

          {parentHash && (
            <HStack mb={2} fontSize="sm">
              <Text fontWeight="semibold">Parent:</Text>
              <Text isTruncated maxW="200px">
                {parentHash}
              </Text>
              <Tooltip label="View Parent Block">
                <IconButton
                  as={RouterLink}
                  to={`/block/${parentHash}`}
                  icon={<ExternalLinkIcon />}
                  size="xs"
                  variant="ghost"
                  aria-label="View Parent Block"
                />
              </Tooltip>
            </HStack>
          )}
        </>
      )}

      <Flex justifyContent="space-between" fontSize="sm">
        <HStack>
          <Text fontWeight="semibold">Miner:</Text>
          {miner ? (
            <Link as={RouterLink} to={`/address/${miner}`} color="blue.500">
              {miner.substring(0, 6)}...{miner.substring(miner.length - 4)}
            </Link>
          ) : (
            <Text>-</Text>
          )}
        </HStack>

        {validator && !isCompact && (
          <HStack>
            <Text fontWeight="semibold">Validator:</Text>
            <Link as={RouterLink} to={`/address/${validator}`} color="blue.500">
              {validator.substring(0, 6)}...{validator.substring(validator.length - 4)}
            </Link>
          </HStack>
        )}

        <HStack>
          <Text fontWeight="semibold">Txs:</Text>
          <Badge colorScheme="blue" borderRadius="full">
            {txCount}
          </Badge>
        </HStack>
      </Flex>

      {!isCompact && (
        <Flex mt={3} justifyContent="space-between" fontSize="sm" color="gray.500">
          <HStack>
            <Text fontWeight="semibold">Size:</Text>
            <Text>{block.size || 'N/A'} bytes</Text>
          </HStack>
          <HStack>
            <Text fontWeight="semibold">Difficulty:</Text>
            <Text>{block.difficulty || 'N/A'}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="semibold">Gas Used:</Text>
            <Text>{block.gasUsed || 'N/A'}</Text>
          </HStack>
        </Flex>
      )}
    </Box>
  );
};

export default BlockCard; 