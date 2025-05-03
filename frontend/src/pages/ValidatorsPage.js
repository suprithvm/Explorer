import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  HStack,
  Progress,
  Badge,
  Link,
  Skeleton,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import { getValidators } from '../services/api';

export default function ValidatorsPage() {
  const [validators, setValidators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalValidators, setTotalValidators] = useState(0);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    const fetchValidators = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getValidators(page, limit);
        setValidators(response.data);
        setTotalValidators(response.pagination?.total || 0);
        setHasMore(response.pagination?.hasNext || false);
      } catch (err) {
        console.error('Error fetching validators:', err);
        setError('Failed to load validators. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchValidators();
  }, [page, limit]);

  // Format value from wei to SUP
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    const valueInEth = parseFloat(value) / 1e18;
    return `${valueInEth.toFixed(4)} SUP`;
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Heading as="h1" size="lg" mb={6}>
        Validators
      </Heading>

      {error ? (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          {error}
        </Alert>
      ) : (
        <>
          <Box mb={4}>
            <Text color="gray.500">
              Showing validators {Math.min(1, (page - 1) * limit + 1)} to {Math.min(page * limit, totalValidators)} of {totalValidators} total validators
            </Text>
          </Box>
          
          <Box 
            bg={bgColor} 
            borderRadius="lg" 
            borderWidth="1px" 
            borderColor={borderColor} 
            boxShadow="sm" 
            overflow="hidden"
            mb={6}
          >
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Rank</Th>
                  <Th>Address</Th>
                  <Th isNumeric>Stake</Th>
                  <Th isNumeric>Voting Power</Th>
                  <Th isNumeric>Blocks Proposed</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {isLoading ? (
                  Array(limit).fill(0).map((_, i) => (
                    <Tr key={i}>
                      <Td><Skeleton height="20px" /></Td>
                      <Td><Skeleton height="20px" /></Td>
                      <Td><Skeleton height="20px" /></Td>
                      <Td><Skeleton height="20px" /></Td>
                      <Td><Skeleton height="20px" /></Td>
                      <Td><Skeleton height="20px" /></Td>
                    </Tr>
                  ))
                ) : validators.length > 0 ? (
                  validators.map((validator, index) => (
                    <Tr key={validator.address}>
                      <Td>{(page - 1) * limit + index + 1}</Td>
                      <Td>
                        <Link as={RouterLink} to={`/address/${validator.address}`} color="blue.500">
                          {validator.address.substring(0, 10)}...{validator.address.substring(validator.address.length - 8)}
                        </Link>
                      </Td>
                      <Td isNumeric>{formatValue(validator.stake)}</Td>
                      <Td isNumeric>
                        <Box>
                          <Text>{validator.votingPower}%</Text>
                          <Progress 
                            value={validator.votingPower} 
                            size="xs" 
                            colorScheme="blue" 
                            borderRadius="full" 
                            mt={1}
                          />
                        </Box>
                      </Td>
                      <Td isNumeric>{validator.blocksProposed}</Td>
                      <Td>
                        <Badge colorScheme={validator.status === 'active' ? 'green' : 'gray'}>
                          {validator.status}
                        </Badge>
                      </Td>
                    </Tr>
                  ))
                ) : (
                  <Tr>
                    <Td colSpan={6} textAlign="center">No validators found</Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
          
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