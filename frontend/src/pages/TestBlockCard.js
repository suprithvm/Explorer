import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  SimpleGrid
} from '@chakra-ui/react';
import BlockCard from '../components/blocks/BlockCard';

export default function TestBlockCard() {
  // Sample blocks for testing - representing different scenarios
  const testBlocks = [
    {
      // PoW Block (Miner only)
      number: 1001,
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      parentHash: '0x0987654321fedcba0987654321fedcba0987654321fedcba0987654321fedcba',
      timestamp: Date.now() / 1000 - 3600, // 1 hour ago
      miner: 'sup9876543210abcdef9876543210abcdef987654',
      txCount: 5,
      difficulty: 2500000,
      gasUsed: 21000,
      size: 4096,
      isPow: true
    },
    {
      // PoS Block (Validator only)
      number: 1002,
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      parentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      timestamp: Date.now() / 1000 - 1800, // 30 minutes ago
      validator: 'sup0123456789abcdef0123456789abcdef012345',
      txCount: 12,
      difficulty: 2500000,
      gasUsed: 150000,
      size: 8192
    },
    {
      // Hybrid Block (both Miner and Validator)
      number: 1003,
      hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      parentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      timestamp: Date.now() / 1000 - 600, // 10 minutes ago
      miner: 'supabcdef0123456789abcdef0123456789abcdef',
      validator: 'sup0123456789abcdef0123456789abcdef012345',
      txCount: 8,
      difficulty: 2500000,
      gasUsed: 95000,
      size: 6144
    },
    {
      // Alternative field names (minedBy and validatedBy)
      number: 1004,
      hash: '0x5678901234abcdef5678901234abcdef5678901234abcdef5678901234abcdef',
      parentHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      timestamp: Date.now() / 1000 - 300, // 5 minutes ago
      minedBy: 'sup5678901234abcdef5678901234abcdef567890',
      validatedBy: 'sup1234567890abcdef1234567890abcdef123456',
      txCount: 15,
      difficulty: 2500000,
      gasUsed: 125000,
      size: 7168
    }
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box textAlign="center" mb={8}>
          <Heading as="h1" size="xl" mb={4}>BlockCard Component Test</Heading>
          <Text fontSize="lg">Testing display of PoW, PoS, and Hybrid blocks</Text>
        </Box>

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          <Box>
            <Heading as="h2" size="md" mb={4}>Compact View (isCompact=true)</Heading>
            <VStack spacing={6}>
              {testBlocks.map((block, index) => (
                <Box key={index} width="100%">
                  <BlockCard block={block} isCompact={true} />
                </Box>
              ))}
            </VStack>
          </Box>

          <Box>
            <Heading as="h2" size="md" mb={4}>Full View (isCompact=false)</Heading>
            <VStack spacing={6}>
              {testBlocks.map((block, index) => (
                <Box key={index} width="100%">
                  <BlockCard block={block} isCompact={false} />
                </Box>
              ))}
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </Container>
  );
} 