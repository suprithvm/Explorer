import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Divider,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  HStack,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Skeleton,
  useColorModeValue,
  Alert,
  AlertIcon,
  useClipboard,
  IconButton,
  Tooltip,
  Badge,
  Input,
  InputGroup,
  InputRightElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Icon,
  Tag,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Link,
  useDisclosure,
  Collapse,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { 
  CopyIcon, 
  CheckIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  ChevronDownIcon, 
  ArrowBackIcon, 
  TimeIcon, 
  DownloadIcon, 
  ExternalLinkIcon, 
  AddIcon,
  SearchIcon,
  StarIcon, 
  InfoIcon 
} from '@chakra-ui/icons';
import { 
  FaEthereum, 
  FaCopy, 
  FaRegListAlt, 
  FaArrowRight, 
  FaArrowLeft, 
  FaExchangeAlt, 
  FaPaperPlane, 
  FaCoins, 
  FaWallet,
  FaExclamationCircle,
  FaTag,
  FaGamepad,
  FaMoneyBillWave,
  FaShoppingCart
} from 'react-icons/fa';
import { getAddressDetails, getAddressTransactions, getAddressBlocks } from '../services/api';
import TransactionCard from '../components/transactions/TransactionCard';
import BlockCard from '../components/blocks/BlockCard';

const TransactionRow = ({ tx, address }) => {
  const [isOpen, setIsOpen] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverColor = useColorModeValue('gray.50', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const accentColor = useColorModeValue('brand.500', 'brand.400');
  
  const isOutgoing = tx.from === address;
  const directionBg = isOutgoing ? 'red.100' : 'green.100';
  const directionColor = isOutgoing ? 'red.500' : 'green.500';
  const directionText = isOutgoing ? 'OUT' : 'IN';
  
  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Format value from wei to SUP
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    // Supereum amounts are already in the native units, no need to divide by 1e18
    const valueInSup = parseFloat(value);
    return `${valueInSup.toFixed(6)} SUP`;
  };
  
  return (
    <>
      <Tr 
        cursor="pointer" 
        onClick={() => setIsOpen(!isOpen)}
        _hover={{ bg: hoverColor }}
        transition="background-color 0.2s"
      >
        <Td>
          <Flex align="center">
            <Badge 
              mr={3} 
              px={2} 
              py={1} 
              borderRadius="md" 
              bg={directionBg} 
              color={directionColor}
              fontSize="xs"
              fontWeight="bold"
            >
              {directionText}
            </Badge>
            <Link 
              as={RouterLink} 
              to={`/tx/${tx.hash}`}
              color={accentColor}
              fontFamily="mono"
              fontSize="sm"
              fontWeight="medium"
            >
              {tx.hash.substring(0, 16)}...
            </Link>
          </Flex>
        </Td>
        <Td isNumeric>
          <Link
            as={RouterLink}
            to={`/block/${tx.blockNumber}`}
            color={accentColor}
          >
            {tx.blockNumber}
          </Link>
        </Td>
        <Td>
          <Flex align="center">
            <Icon as={TimeIcon} color={textColor} mr={1} boxSize="14px" />
            <Text fontSize="sm">{formatDate(tx.timestamp)}</Text>
          </Flex>
        </Td>
        <Td>
          {isOutgoing ? (
            <Flex align="center">
              <Text fontSize="sm" mr={1}>To:</Text>
              <Link
                as={RouterLink}
                to={`/address/${tx.to}`}
                color={accentColor}
                fontFamily="mono"
                fontSize="sm"
              >
                {tx.to.substring(0, 10)}...
              </Link>
            </Flex>
          ) : (
            <Flex align="center">
              <Text fontSize="sm" mr={1}>From:</Text>
              <Link
                as={RouterLink}
                to={`/address/${tx.from}`}
                color={accentColor}
                fontFamily="mono"
                fontSize="sm"
              >
                {tx.from.substring(0, 10)}...
              </Link>
            </Flex>
          )}
        </Td>
        <Td isNumeric>
          <Text 
            fontWeight="bold" 
            color={directionColor}
          >
            {isOutgoing ? '-' : '+'}{formatValue(tx.value)}
          </Text>
        </Td>
        <Td isNumeric color={textColor} fontSize="sm">
          {formatValue(tx.fee || '0')}
        </Td>
      </Tr>
      <Tr>
        <Td colSpan={6} p={0}>
          <Collapse in={isOpen} animateOpacity>
            <Box 
              p={4} 
              bg={hoverColor} 
              borderBottomWidth="1px"
              borderColor={borderColor}
            >
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={1}>Transaction Hash:</Text>
                  <Link 
                    as={RouterLink} 
                    to={`/tx/${tx.hash}`}
                    color={accentColor}
                    fontFamily="mono"
                    fontSize="sm"
                  >
                    {tx.hash}
                  </Link>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={1}>Status:</Text>
                  <Badge 
                    colorScheme={tx.status === 'success' ? 'green' : tx.status === 'pending' ? 'yellow' : 'red'}
                    borderRadius="full"
                  >
                    {tx.status}
                  </Badge>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="bold" mb={1}>Fee:</Text>
                  <Text fontSize="sm">{formatValue(tx.fee || '0')}</Text>
                </Box>
              </SimpleGrid>
            </Box>
          </Collapse>
        </Td>
      </Tr>
    </>
  );
};

export default function AddressPage() {
  const { address } = useParams();
  const navigate = useNavigate();
  const [addressData, setAddressData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [tokenHoldings, setTokenHoldings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [blockPage, setBlockPage] = useState(1);
  const [hasMoreTx, setHasMoreTx] = useState(false);
  const [hasMoreBlocks, setHasMoreBlocks] = useState(false);
  
  const { hasCopied, onCopy } = useClipboard(address);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = useColorModeValue('brand.500', 'brand.400');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const headerBg = useColorModeValue('gray.50', 'gray.750');
  const sponsoredBg = useColorModeValue('gray.800', 'gray.900');
  const sponsoredText = useColorModeValue('white', 'gray.200');
  const cardBg = useColorModeValue('white', 'gray.800');
  const breadcrumbColor = useColorModeValue('gray.500', 'gray.400');

  useEffect(() => {
    const fetchAddressData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getAddressDetails(address);
        setAddressData(data);
        
        // Mock token holdings data
        setTokenHoldings([
          { symbol: 'SUP', name: 'Supereum', balance: data?.balance || '0', value: data?.balance || '0' }
        ]);
      } catch (err) {
        console.error('Error fetching address details:', err);
        setError('Failed to load address details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAddressData();
  }, [address]);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (activeTab !== 0) return;
      
      try {
        const txData = await getAddressTransactions(address, txPage, 25);
        if (txData && txData.transactions) {
          setTransactions(txData.transactions);
          setHasMoreTx(txData.pagination?.hasNext || false);
        } else {
          console.warn('No transaction data returned from API');
          setTransactions([]);
          setHasMoreTx(false);
        }
      } catch (err) {
        console.error('Error fetching address transactions:', err);
        setTransactions([]);
        setHasMoreTx(false);
      }
    };
    
    fetchTransactions();
  }, [address, txPage, activeTab]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (activeTab !== 1) return;
      
      try {
        const blockData = await getAddressBlocks(address, blockPage, 10);
        if (blockData && blockData.blocks) {
          setBlocks(blockData.blocks);
          setHasMoreBlocks(blockData.pagination?.hasNext || false);
        } else {
          console.warn('No block data returned from API');
          setBlocks([]);
          setHasMoreBlocks(false);
        }
      } catch (err) {
        console.error('Error fetching address blocks:', err);
        setBlocks([]);
        setHasMoreBlocks(false);
      }
    };
    
    fetchBlocks();
  }, [address, blockPage, activeTab]);

  // Format value from wei to SUP
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    // Supereum amounts are already in the native units, no need to divide by 1e18
    const valueInSup = parseFloat(value);
    return `${valueInSup.toFixed(6)} SUP`;
  };

  // Go back to previous page
  const goBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Skeleton height="50px" mb={4} />
        <Skeleton height="200px" mb={8} />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="xl" boxShadow="md">
          <AlertIcon />
          {error}
        </Alert>
      </Container>
    );
  }

  const transactionsList = transactions || [];

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
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Address</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Address Header */}
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
            <Icon as={FaWallet} boxSize="24px" color={accentColor} />
            <Heading as="h1" size="lg">
              Address
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
              {address}
              <HStack position="absolute" right="2" top="2">
                <Tooltip label={hasCopied ? 'Copied!' : 'Copy Address'} hasArrow>
                  <IconButton
                    aria-label="Copy address"
                    icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
                    size="sm"
                    onClick={onCopy}
                    variant="ghost"
                    colorScheme="blue"
                  />
                </Tooltip>
              </HStack>
            </Box>
          </Box>
        </Box>

        <HStack spacing={4}>
          <Button 
            leftIcon={<FaPaperPlane />}
            variant="solid"
            colorScheme="blue"
            size="sm"
          >
            Send SUP
          </Button>
        </HStack>
      </Flex>

      {/* Overview Section */}
      <Box
        bg={cardBg}
        borderRadius="xl"
        borderWidth="1px"
        borderColor={borderColor}
        boxShadow="sm"
        p={5}
        position="relative"
        overflow="hidden"
        transition="all 0.3s"
        _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
        mb={8}
      >
        <Box 
          position="absolute" 
          top={0} 
          left={0} 
          right={0} 
          h="5px" 
          bgGradient="linear(to-r, brand.400, brand.600)" 
        />
        
        <HStack mb={4}>
          <Icon as={FaCoins} color={accentColor} boxSize="20px" />
          <Heading size="md">Overview</Heading>
        </HStack>
        
        <VStack align="stretch" spacing={4} mt={4}>
          <Box>
            <Text color={textColor} fontWeight="medium">SUP BALANCE</Text>
            <HStack mt={2}>
              <Icon as={FaCoins} color="blue.400" />
              <Text fontWeight="bold">{formatValue(addressData?.balance || '0')}</Text>
            </HStack>
          </Box>
          
          <Box>
            <Text color={textColor} fontWeight="medium">TRANSACTIONS</Text>
            <Text fontWeight="bold" mt={2}>{addressData?.txCount || 0} transactions</Text>
          </Box>
          
          {(addressData?.isMiner || addressData?.isValidator) && (
            <Box>
              <Text color={textColor} fontWeight="medium">
                {addressData?.isMiner ? 'MINED BLOCKS' : 'VALIDATED BLOCKS'}
              </Text>
              <Text fontWeight="bold" mt={2}>{addressData?.minedBlocks || 0} blocks</Text>
            </Box>
          )}
          
          <Box>
            <Text color={textColor} fontWeight="medium">FIRST SEEN</Text>
            <Text fontWeight="bold" mt={2}>
              {addressData?.firstSeen ? new Date(addressData.firstSeen).toLocaleDateString() : 'Unknown'}
            </Text>
          </Box>
        </VStack>
      </Box>

      {/* Tabs Section */}
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
                <Icon as={FaExchangeAlt} boxSize="14px" />
                <Text>Transactions ({addressData?.txCount || 0})</Text>
              </HStack>
            </Tab>
            {(addressData?.isMiner || addressData?.isValidator) && (
              <Tab 
                _selected={{ 
                  color: accentColor, 
                  borderColor: borderColor, 
                  borderBottomColor: cardBg,
                  fontWeight: "semibold" 
                }}
              >
                <HStack>
                  <Icon as={FaCopy} boxSize="14px" />
                  <Text>Blocks ({addressData?.minedBlocks || 0})</Text>
                </HStack>
              </Tab>
            )}
          </TabList>
          
          <TabPanels>
            {/* Transactions Tab */}
            <TabPanel p={0}>
              {transactionsList.length > 0 ? (
                <Box>
                  <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
                    <Flex justify="space-between" align="center" mb={4}>
                      <Text fontSize="lg" fontWeight="bold">Latest Transactions</Text>
                      
                      <Button 
                        leftIcon={<DownloadIcon />} 
                        size="sm" 
                        variant="outline"
                      >
                        Download
                      </Button>
                    </Flex>

                    <Table variant="simple">
                      <Thead>
                        <Tr>
                          <Th>Transaction Hash</Th>
                          <Th isNumeric>Block</Th>
                          <Th>Age</Th>
                          <Th>From/To</Th>
                          <Th isNumeric>Value</Th>
                          <Th isNumeric>Txn Fee</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {transactionsList.map(tx => (
                          <TransactionRow 
                            key={tx.hash} 
                            tx={tx} 
                            address={address}
                          />
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  
                  <Flex justify="center" py={4} borderTopWidth="1px" borderColor={borderColor}>
                    <HStack>
                      <Button 
                        onClick={() => setTxPage(prev => Math.max(prev - 1, 1))} 
                        isDisabled={txPage === 1}
                        leftIcon={<ChevronLeftIcon />}
                        size="sm"
                      >
                        Previous
                      </Button>
                      <Text>Page {txPage}</Text>
                      <Button 
                        onClick={() => setTxPage(prev => prev + 1)} 
                        isDisabled={!hasMoreTx}
                        rightIcon={<ChevronRightIcon />}
                        size="sm"
                      >
                        Next
                      </Button>
                    </HStack>
                  </Flex>
                </Box>
              ) : (
                <Box textAlign="center" py={12}>
                  <Icon as={FaExclamationCircle} boxSize="40px" color={textColor} mb={4} />
                  <Heading size="md" mb={2}>No Transactions Found</Heading>
                  <Text>This address hasn't made any transactions yet</Text>
                </Box>
              )}
            </TabPanel>
            
            {/* Blocks Tab */}
            {(addressData?.isMiner || addressData?.isValidator) && (
              <TabPanel p={0}>
                {blocks.length > 0 ? (
                  <Box>
                    <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {addressData?.isMiner ? 'Mined Blocks' : 'Validated Blocks'}
                      </Text>
                      
                      <Table variant="simple">
                        <Thead>
                          <Tr>
                            <Th>Block</Th>
                            <Th>Age</Th>
                            <Th isNumeric>Txns</Th>
                            <Th isNumeric>Size</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {blocks.map(block => (
                            <Tr key={block.hash}>
                              <Td>
                                <Link
                                  as={RouterLink}
                                  to={`/block/${block.number}`}
                                  color={accentColor}
                                >
                                  {block.number}
                                </Link>
                              </Td>
                              <Td>
                                <Flex align="center">
                                  <Icon as={TimeIcon} color={textColor} mr={1} boxSize="14px" />
                                  <Text fontSize="sm">
                                    {block.timestamp ? new Date(block.timestamp).toLocaleString() : 'Unknown'}
                                  </Text>
                                </Flex>
                              </Td>
                              <Td isNumeric>{block.transactionCount || 0}</Td>
                              <Td isNumeric>{block.size || 0} bytes</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </Box>
                    
                    <Flex justify="center" py={4} borderTopWidth="1px" borderColor={borderColor}>
                      <HStack>
                        <Button 
                          onClick={() => setBlockPage(prev => Math.max(prev - 1, 1))} 
                          isDisabled={blockPage === 1}
                          leftIcon={<ChevronLeftIcon />}
                          size="sm"
                        >
                          Previous
                        </Button>
                        <Text>Page {blockPage}</Text>
                        <Button 
                          onClick={() => setBlockPage(prev => prev + 1)} 
                          isDisabled={!hasMoreBlocks}
                          rightIcon={<ChevronRightIcon />}
                          size="sm"
                        >
                          Next
                        </Button>
                      </HStack>
                    </Flex>
                  </Box>
                ) : (
                  <Box textAlign="center" py={12}>
                    <Icon as={FaExclamationCircle} boxSize="40px" color={textColor} mb={4} />
                    <Heading size="md" mb={2}>No Blocks Found</Heading>
                    <Text>This address hasn't mined or validated any blocks yet</Text>
                  </Box>
                )}
              </TabPanel>
            )}
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
} 