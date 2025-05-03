import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
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
  Button,
  Icon,
  Tooltip,
  Table,
  Tbody,
  Tr,
  Td,
  useClipboard,
  IconButton,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
} from '@chakra-ui/react';
import { 
  CopyIcon, 
  CheckIcon, 
  ChevronRightIcon, 
  ArrowBackIcon, 
  TimeIcon, 
  InfoIcon,
  ExternalLinkIcon,
} from '@chakra-ui/icons';
import { 
  FaExchangeAlt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaGasPump, 
  FaArrowRight,
  FaArrowLeft,
  FaCode,
  FaCubes,
} from 'react-icons/fa';
import { getTransactionByHash } from '../services/api';

export default function TransactionPage() {
  const { hash } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const { hasCopied: hashCopied, onCopy: onCopyHash } = useClipboard(hash);
  const { hasCopied: fromCopied, onCopy: onCopyFrom } = useClipboard(transaction?.from || '');
  const { hasCopied: toCopied, onCopy: onCopyTo } = useClipboard(transaction?.to || '');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.400');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('gray.50', 'gray.750');
  const cardBg = useColorModeValue('white', 'gray.800');
  const breadcrumbColor = useColorModeValue('gray.500', 'gray.400');
  const successBg = useColorModeValue('green.50', 'green.900');
  const pendingBg = useColorModeValue('yellow.50', 'yellow.900');
  const failedBg = useColorModeValue('red.50', 'red.900');

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

  // Format the value (wei to SUP)
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    // Supereum amounts are already in the native units, no need to divide by 1e18
    const valueInSup = parseFloat(value);
    return `${valueInSup.toFixed(8)} SUP`;
  };

  // Determine transaction status color and icon
  const getStatusInfo = (status) => {
    // First convert status to string to handle cases where it's a boolean
    const statusStr = String(status).toLowerCase();
    
    if (statusStr === 'true' || statusStr === 'success' || statusStr === 'confirmed') {
      return { 
        color: 'green', 
        icon: FaCheckCircle, 
        text: 'Success',
        bg: successBg 
      };
    } else if (statusStr === 'pending') {
      return { 
        color: 'yellow', 
        icon: FaClock, 
        text: 'Pending',
        bg: pendingBg 
      };
    } else if (statusStr === 'false' || statusStr === 'failed') {
      return { 
        color: 'red', 
        icon: FaTimesCircle, 
        text: 'Failed',
        bg: failedBg 
      };
    } else {
      return { 
        color: 'gray', 
        icon: InfoIcon, 
        text: 'Unknown',
        bg: 'gray.50' 
      };
    }
  };

  // Go back to previous page
  const goBack = () => {
    navigate(-1);
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
  
  const statusInfo = getStatusInfo(transaction.status);

  return (
    <Container maxW="container.xl" py={8}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        mb={6} 
        fontSize="sm" 
        color={breadcrumbColor} 
        separator={<ChevronRightIcon color={breadcrumbColor} />}
      >
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink as={RouterLink} to="/transactions">Transactions</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Transaction Details</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Transaction Header */}
      <Flex 
        justify="space-between" 
        align={{ base: "start", md: "center" }}
        direction={{ base: "column", md: "row" }}
        mb={6}
        bg={headerBg}
        p={6}
        borderRadius="xl"
        boxShadow="sm"
      >
        <Box mb={{ base: 4, md: 0 }}>
          <HStack mb={2}>
            <Button 
              leftIcon={<ArrowBackIcon />} 
              variant="outline"
              size="sm"
              onClick={goBack}
              mr={2}
            >
              Back
            </Button>
            <Icon as={FaExchangeAlt} boxSize="24px" color={accentColor} />
            <Heading as="h1" size="lg">
              Transaction Details
            </Heading>
          </HStack>

          <Box maxW={{ base: "100%", lg: "md" }} fontFamily="mono" fontSize="sm" position="relative">
            <Box 
              p={2} 
              bg={cardBg} 
              borderRadius="md" 
              borderWidth="1px" 
              borderColor={borderColor}
              pr="3rem"
              wordBreak="break-all"
              fontWeight="medium"
            >
              {hash}
              <HStack position="absolute" right="2" top="2">
                <Tooltip label={hashCopied ? 'Copied!' : 'Copy Transaction Hash'} hasArrow>
                  <IconButton
                    aria-label="Copy transaction hash"
                    icon={hashCopied ? <CheckIcon /> : <CopyIcon />}
                    size="sm"
                    onClick={onCopyHash}
                    variant="ghost"
                    colorScheme="blue"
                  />
                </Tooltip>
              </HStack>
            </Box>
          </Box>
        </Box>

        <Badge 
          px={3} 
          py={2} 
          borderRadius="md" 
          colorScheme={statusInfo.color}
          variant="subtle"
          fontSize="md"
        >
          <HStack>
            <Icon as={statusInfo.icon} />
            <Text>{statusInfo.text}</Text>
          </HStack>
        </Badge>
      </Flex>

      {/* Transaction Overview Card */}
      <SimpleGrid columns={{ base: 1, lg: 1 }} spacing={6} mb={8}>
        <Box
          bg={cardBg}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          boxShadow="sm"
          overflow="hidden"
        >
          <Box 
            bg={statusInfo.bg} 
            p={4} 
            borderBottomWidth="1px" 
            borderColor={borderColor}
          >
            <HStack>
              <Icon as={statusInfo.icon} color={`${statusInfo.color}.500`} boxSize="20px" />
              <Text fontWeight="medium">
                Transaction {statusInfo.text}
                {transaction.blockNumber && ` and confirmed in Block #${transaction.blockNumber}`}
              </Text>
            </HStack>
          </Box>

          <Box p={0}>
            <Table variant="simple">
              <Tbody>
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Transaction Hash:</Td>
                  <Td position="relative">
                    <Text fontFamily="mono">{transaction.hash}</Text>
                    <IconButton
                      position="absolute"
                      right="4"
                      top="50%"
                      transform="translateY(-50%)"
                      aria-label="Copy transaction hash"
                      icon={hashCopied ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      onClick={onCopyHash}
                      variant="ghost"
                      colorScheme="blue"
                    />
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Status:</Td>
                  <Td>
                    <Badge colorScheme={statusInfo.color} px={2} py={1}>
                      <HStack>
                        <Icon as={statusInfo.icon} />
                        <Text>{statusInfo.text}</Text>
                      </HStack>
                    </Badge>
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Block:</Td>
                  <Td>
                    {transaction.blockNumber ? (
                      <HStack>
                        <Icon as={FaCubes} color={accentColor} />
                        <Link as={RouterLink} to={`/block/${transaction.blockNumber}`} color={accentColor}>
                          {transaction.blockNumber}
                        </Link>
                      </HStack>
                    ) : (
                      <Badge colorScheme="yellow">Pending</Badge>
                    )}
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Timestamp:</Td>
                  <Td>
                    <HStack>
                      <Icon as={TimeIcon} color={textColor} />
                      <Text>{formatDate(transaction.timestamp)}</Text>
                    </HStack>
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>From:</Td>
                  <Td position="relative">
                    <HStack>
                      <Icon as={FaArrowRight} color="red.500" />
                      <Link as={RouterLink} to={`/address/${transaction.from}`} color={accentColor} fontFamily="mono">
                        {transaction.from}
                      </Link>
                    </HStack>
                    <IconButton
                      position="absolute"
                      right="4"
                      top="50%"
                      transform="translateY(-50%)"
                      aria-label="Copy address"
                      icon={fromCopied ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      onClick={onCopyFrom}
                      variant="ghost"
                      colorScheme="blue"
                    />
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>To:</Td>
                  <Td position="relative">
                    {transaction.to ? (
                      <>
                        <HStack>
                          <Icon as={FaArrowLeft} color="green.500" />
                          <Link as={RouterLink} to={`/address/${transaction.to}`} color={accentColor} fontFamily="mono">
                            {transaction.to}
                          </Link>
                        </HStack>
                        <IconButton
                          position="absolute"
                          right="4"
                          top="50%"
                          transform="translateY(-50%)"
                          aria-label="Copy address"
                          icon={toCopied ? <CheckIcon /> : <CopyIcon />}
                          size="sm"
                          onClick={onCopyTo}
                          variant="ghost"
                          colorScheme="blue"
                        />
                      </>
                    ) : (
                      <Badge colorScheme="purple">Contract Creation</Badge>
                    )}
                  </Td>
                </Tr>
                
                {transaction.contractAddress && (
                  <Tr>
                    <Td fontWeight="bold" width="200px" bg={headerBg}>Contract Created:</Td>
                    <Td>
                      <Link as={RouterLink} to={`/address/${transaction.contractAddress}`} color={accentColor} fontFamily="mono">
                        {transaction.contractAddress}
                      </Link>
                    </Td>
                  </Tr>
                )}
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Value:</Td>
                  <Td fontWeight="medium">
                    {formatValue(transaction.value)}
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Transaction Fee:</Td>
                  <Td>
                    {transaction.fee ? formatValue(transaction.fee) : 'N/A'}
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Gas Price:</Td>
                  <Td>
                    <HStack>
                      <Icon as={FaGasPump} color={textColor} />
                      <Text>{transaction.gasPrice ? `${(parseInt(transaction.gasPrice) / 1e9).toFixed(2)} Gwei` : 'N/A'}</Text>
                    </HStack>
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Gas Limit:</Td>
                  <Td>{transaction.gas || 'N/A'}</Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Gas Used:</Td>
                  <Td>{transaction.gasUsed || 'N/A'}</Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Nonce:</Td>
                  <Td>{transaction.nonce || 'N/A'}</Td>
                </Tr>
              </Tbody>
            </Table>
          </Box>
        </Box>
      </SimpleGrid>

      {/* Tabs Section for Input Data */}
      {transaction.input && transaction.input !== '0x' && (
        <Box
          bg={cardBg}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          boxShadow="md"
          overflow="hidden"
          mb={8}
        >
          <Tabs variant="enclosed" onChange={(index) => setActiveTab(index)}>
            <TabList bg={headerBg} px={4} pt={4}>
              <Tab 
                _selected={{ 
                  color: accentColor, 
                  borderColor: borderColor, 
                  borderBottomColor: cardBg,
                  fontWeight: "semibold" 
                }}
              >
                <HStack>
                  <Icon as={FaCode} boxSize="14px" />
                  <Text>Input Data</Text>
                </HStack>
              </Tab>
            </TabList>
            
            <TabPanels>
              <TabPanel p={6}>
                <Text mb={3} fontWeight="medium">Transaction Input Data:</Text>
                <Code p={4} borderRadius="md" w="100%" overflow="auto" fontSize="sm" whiteSpace="pre-wrap" bg="gray.50">
                  {transaction.input}
                </Code>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      )}
    </Container>
  );
} 