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
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Tooltip,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, ChevronRightIcon as BreadcrumbIcon, TimeIcon } from '@chakra-ui/icons';
import { FaUsers, FaUserShield, FaServer, FaSync } from 'react-icons/fa';
import { getValidators } from '../services/api';

export default function ValidatorsPage() {
  const [validators, setValidators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const [totalValidators, setTotalValidators] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.750');
  const breadcrumbColor = useColorModeValue('gray.500', 'gray.400');
  const accentColor = useColorModeValue('brand.500', 'brand.400');

  useEffect(() => {
    const fetchValidators = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await getValidators(page, limit);
        
        // Access validators from data property
        setValidators(response.data || []);
        setTotalValidators(response.pagination?.total || 0);
        setHasMore(response.pagination?.hasNext || false);
        
        // Set last updated time
        if (response.lastUpdated) {
          setLastUpdated(new Date(response.lastUpdated));
        }
      } catch (err) {
        console.error('Error fetching validators:', err);
        setError('Failed to load validators. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchValidators();
  }, [page, limit]);

  // Format value to SUP
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    // Supereum amounts are already in the native units
    const valueInSup = parseFloat(value);
    return `${valueInSup.toFixed(4)} SUP`;
  };

  // Helper for status color
  const getStatusColor = (status) => {
    if (status === 0) return 'green';
    if (status === 1) return 'red';
    if (status === 2) return 'yellow';
    return 'gray';
  };
  
  // Helper for status text
  const getStatusText = (status) => {
    if (status === 0) return 'active';
    if (status === 1) return 'jailed';
    if (status === 2) return 'inactive';
    return 'unknown';
  };
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    
    // Calculate time difference
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    
    return date.toLocaleString();
  };

  return (
    <Container maxW="container.xl" py={8}>
      {/* Breadcrumb */}
      <Breadcrumb 
        mb={6} 
        fontSize="sm" 
        color={breadcrumbColor} 
        separator={<BreadcrumbIcon color={breadcrumbColor} />}
      >
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Validators</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Header */}
      <Flex 
        justify="space-between" 
        align="center"
        mb={6}
        bg={headerBg}
        p={6}
        borderRadius="xl"
        boxShadow="sm"
      >
        <HStack>
          <Icon as={FaUserShield} boxSize="24px" color={accentColor} />
          <Heading as="h1" size="lg">
            Validators
          </Heading>
        </HStack>
        
        {lastUpdated && (
          <Tooltip label={`Data refreshes every 2 minutes. Last updated at ${lastUpdated.toLocaleTimeString()}`}>
            <HStack spacing={2} color="gray.500">
              <TimeIcon />
              <Text fontSize="sm">
                Updated {formatTimestamp(lastUpdated)}
              </Text>
            </HStack>
          </Tooltip>
        )}
      </Flex>

      {error ? (
        <Alert status="error" borderRadius="xl" mb={4}>
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
            borderRadius="xl" 
            borderWidth="1px" 
            borderColor={borderColor} 
            boxShadow="sm" 
            overflow="hidden"
            mb={6}
          >
            <Table variant="simple">
              <Thead bg={headerBg}>
                <Tr>
                  <Th>Rank</Th>
                  <Th>Address</Th>
                  <Th isNumeric>Stake</Th>
                  <Th isNumeric>Voting Power</Th>
                  <Th isNumeric>Blocks Validated</Th>
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
                        <Link as={RouterLink} to={`/address/${validator.address}`} color={accentColor} fontFamily="mono">
                          {validator.address.substring(0, 10)}...{validator.address.substring(validator.address.length - 8)}
                        </Link>
                      </Td>
                      <Td isNumeric>{formatValue(validator.stake)}</Td>
                      <Td isNumeric>
                        <Box>
                          <Text>{validator.votingPower.toFixed(2)}%</Text>
                          <Progress 
                            value={validator.votingPower} 
                            size="xs" 
                            colorScheme="blue" 
                            borderRadius="full" 
                            mt={1}
                          />
                        </Box>
                      </Td>
                      <Td isNumeric>{validator.blocksValidated}</Td>
                      <Td>
                        <Badge colorScheme={getStatusColor(validator.status)}>
                          {getStatusText(validator.status)}
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
                size="sm"
              >
                Previous
              </Button>
              <Text>Page {page}</Text>
              <Button 
                rightIcon={<ChevronRightIcon />} 
                onClick={() => setPage(prev => prev + 1)} 
                isDisabled={!hasMore || isLoading}
                size="sm"
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