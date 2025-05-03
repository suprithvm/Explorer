import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Divider,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  HStack,
  VStack,
  Skeleton,
  useColorModeValue,
  Link,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Icon,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Tooltip,
  IconButton,
  useClipboard,
  Code,
} from '@chakra-ui/react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ArrowBackIcon, 
  TimeIcon, 
  InfoIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
} from '@chakra-ui/icons';
import { 
  FaCube, 
  FaUser, 
  FaGasPump, 
  FaServer, 
  FaHashtag, 
  FaLink, 
  FaCubes, 
  FaRegClock,
  FaHammer,
  FaUserCheck,
  FaIdBadge,
  FaStamp,
  FaLeaf,
  FaReceipt,
  FaDatabase,
  FaTimes,
  FaCircleNotch,
  FaExchangeAlt,
} from 'react-icons/fa';
import { getBlockByIdentifier, getBlockTransactions } from '../services/api';
import TransactionCard from '../components/transactions/TransactionCard';

export default function BlockPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [block, setBlock] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  const { hasCopied: hashCopied, onCopy: onCopyHash } = useClipboard(block?.hash || '');
  const { hasCopied: minerCopied, onCopy: onCopyMiner } = useClipboard(block?.header?.MinedBy || block?.miner || '');
  const { hasCopied: validatorCopied, onCopy: onCopyValidator } = useClipboard(block?.header?.ValidatedBy || block?.validator || '');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const highlightBg = useColorModeValue('gray.50', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.750');
  const accentColor = useColorModeValue('brand.500', 'brand.400');
  const breadcrumbColor = useColorModeValue('gray.500', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');

  useEffect(() => {
    const fetchBlockData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const blockData = await getBlockByIdentifier(identifier);
        console.log("Block data:", blockData); // For debugging
        setBlock(blockData);
        
        const txData = await getBlockTransactions(identifier, page, 10);
        setTransactions(txData.data);
        setHasMore(txData.pagination.hasNext);
      } catch (err) {
        console.error('Error fetching block details:', err);
        setError('Failed to load block details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBlockData();
  }, [identifier, page]);

  // Format timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' 
      ? new Date(timestamp * 1000) 
      : new Date(timestamp);
    return date.toLocaleString();
  };

  // Navigate to previous/next block
  const navigateToBlock = (direction) => {
    if (!block) return;
    
    const targetBlockNumber = direction === 'prev' 
      ? block.number - 1 
      : block.number + 1;
      
    if (targetBlockNumber < 0) return;
    navigate(`/block/${targetBlockNumber}`);
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

  if (!block) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning" borderRadius="xl" boxShadow="md">
          <AlertIcon />
          Block not found
        </Alert>
      </Container>
    );
  }

  // Extract details from nested structure if available
  const blockNumber = block.number || (block.header ? block.header.BlockNumber : 0);
  const blockTimestamp = block.timestamp || (block.header ? block.header.Timestamp : 0);
  const blockMinedBy = block.header?.MinedBy || block.miner || 'Unknown';
  const blockValidatedBy = block.header?.ValidatedBy || block.validator || 'Unknown';
  const blockHash = block.hash || block.originalHash || 'Unknown';
  const blockPreviousHash = block.parentHash || (block.header ? block.header.PreviousHash : 'Unknown');
  const blockDifficulty = block.difficulty || (block.header ? block.header.Difficulty : 'Unknown');
  const blockNonce = block.nonce || (block.header ? block.header.Nonce : 'Unknown');
  const blockGasLimit = block.gasLimit || (block.header ? block.header.GasLimit : 0);
  const blockGasUsed = block.gasUsed || (block.header ? block.header.GasUsed : 0);
  const blockSize = block.size || 0;
  
  // Fix access to root hashes - check multiple possible locations and formats
  const blockMerkleRoot = 
    block.merkleRoot || 
    block.header?.MerkleRoot || 
    (block.body?.transactions?.rootHash) || 
    (block.result?.header?.MerkleRoot) || 
    (block.result?.body?.transactions?.rootHash) || 
    'Unknown';
    
  const blockStateRoot = 
    block.stateRoot || 
    block.header?.StateRoot || 
    (block.result?.header?.StateRoot) || 
    'Unknown';
    
  const blockReceiptsRoot = 
    block.receiptsRoot || 
    block.header?.ReceiptsRoot || 
    (block.result?.header?.ReceiptsRoot) || 
    'Unknown';
    
  const blockExtraData = block.extraData || block.header?.ExtraData || null;
  const blockTxCount = block.txCount || (block.transactions ? block.transactions.length : 0) || 
                      (block.body?.transactions?.txList ? block.body.transactions.txList.length : 0);

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
          <BreadcrumbLink as={RouterLink} to="/blocks">Blocks</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink>Block #{blockNumber}</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Block Header */}
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
            <Icon as={FaCube} boxSize="24px" color={accentColor} /> 
            <Heading as="h1" size="lg">
              Block #{blockNumber}
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
              {blockHash}
              <HStack position="absolute" right="2" top="2">
                <Tooltip label={hashCopied ? 'Copied!' : 'Copy Block Hash'} hasArrow>
                  <IconButton
                    aria-label="Copy block hash"
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

        <HStack spacing={2}>
          <Button 
            leftIcon={<ChevronLeftIcon />} 
            onClick={() => navigateToBlock('prev')} 
            isDisabled={blockNumber <= 0}
            size="sm"
            variant="outline"
          >
            Previous Block
          </Button>
          <Button 
            rightIcon={<ChevronRightIcon />} 
            onClick={() => navigateToBlock('next')}
            size="sm"
            variant="outline"
            colorScheme="blue"
          >
            Next Block
          </Button>
        </HStack>
      </Flex>

      {/* Block Overview Card */}
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
            bg="blue.50" 
            _dark={{ bg: "blue.900" }}
            p={4} 
            borderBottomWidth="1px" 
            borderColor={borderColor}
          >
            <HStack>
              <Icon as={FaCube} color="blue.500" boxSize="20px" />
              <Text fontWeight="medium">
                Block #{blockNumber}
              </Text>
            </HStack>
          </Box>

          <Box p={0}>
            <Table variant="simple">
              <Tbody>
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Block Height:</Td>
                  <Td>
                    <HStack>
                      <Icon as={FaCubes} color={accentColor} />
                      <Text fontWeight="medium">{blockNumber}</Text>
                    </HStack>
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Timestamp:</Td>
                  <Td>
                    <HStack>
                      <Icon as={FaRegClock} color={textColor} />
                      <Text>{formatDate(blockTimestamp)}</Text>
                    </HStack>
                  </Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Mined By:</Td>
                  <Td position="relative">
                    <HStack>
                      <Icon as={FaHammer} color="purple.500" />
                      <Link as={RouterLink} to={`/address/${blockMinedBy}`} color={accentColor} fontFamily="mono">
                        {blockMinedBy}
                      </Link>
                    </HStack>
                    <IconButton
                      position="absolute"
                      right="4"
                      top="50%"
                      transform="translateY(-50%)"
                      aria-label="Copy miner address"
                      icon={minerCopied ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      onClick={onCopyMiner}
                      variant="ghost"
                      colorScheme="blue"
                    />
                  </Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Validated By:</Td>
                  <Td position="relative">
                    <HStack>
                      <Icon as={FaUserCheck} color="green.500" />
                      <Link as={RouterLink} to={`/address/${blockValidatedBy}`} color={accentColor} fontFamily="mono">
                        {blockValidatedBy}
                      </Link>
                    </HStack>
                    <IconButton
                      position="absolute"
                      right="4"
                      top="50%"
                      transform="translateY(-50%)"
                      aria-label="Copy validator address"
                      icon={validatorCopied ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      onClick={onCopyValidator}
                      variant="ghost"
                      colorScheme="blue"
                    />
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Block Hash:</Td>
                  <Td position="relative">
                    <Text fontFamily="mono">{blockHash}</Text>
                    <IconButton
                      position="absolute"
                      right="4"
                      top="50%"
                      transform="translateY(-50%)"
                      aria-label="Copy block hash"
                      icon={hashCopied ? <CheckIcon /> : <CopyIcon />}
                      size="sm"
                      onClick={onCopyHash}
                      variant="ghost"
                      colorScheme="blue"
                    />
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Parent Hash:</Td>
                  <Td>
                    <HStack>
                      <Icon as={FaLink} color={accentColor} />
                      <Link as={RouterLink} to={`/block/${blockPreviousHash}`} color={accentColor} fontFamily="mono">
                        {blockPreviousHash}
                      </Link>
                    </HStack>
                  </Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Gas Used:</Td>
                  <Td>
                    <HStack>
                      <Icon as={FaGasPump} color={textColor} />
                      <Text>{blockGasUsed} ({blockGasUsed > 0 ? ((blockGasUsed / blockGasLimit) * 100).toFixed(2) : 0}%)</Text>
                    </HStack>
                  </Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Gas Limit:</Td>
                  <Td>{blockGasLimit}</Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Difficulty:</Td>
                  <Td>{blockDifficulty}</Td>
                </Tr>
                
                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Nonce:</Td>
                  <Td>{blockNonce}</Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Size:</Td>
                  <Td>
                    <HStack>
                      <Icon as={FaDatabase} color={textColor} />
                      <Text>{blockSize} bytes</Text>
                    </HStack>
                  </Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Merkle Root:</Td>
                  <Td fontFamily="mono">{blockMerkleRoot}</Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>State Root:</Td>
                  <Td fontFamily="mono">{blockStateRoot}</Td>
                </Tr>

                <Tr>
                  <Td fontWeight="bold" width="200px" bg={headerBg}>Receipts Root:</Td>
                  <Td fontFamily="mono">{blockReceiptsRoot}</Td>
                </Tr>
                
                {blockExtraData && (
                  <Tr>
                    <Td fontWeight="bold" width="200px" bg={headerBg}>Extra Data:</Td>
                    <Td>
                      <Code p={2} borderRadius="md" fontSize="sm" fontFamily="mono">
                        {blockExtraData}
                      </Code>
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </SimpleGrid>

      {/* Transactions Panel */}
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
                <Text>Transactions ({blockTxCount})</Text>
              </HStack>
            </Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel p={0}>
              {transactions.length > 0 ? (
                <Box>
                  <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
                    <VStack spacing={4} align="stretch">
                      {transactions.map(tx => (
                        <TransactionCard key={tx.hash} transaction={tx} />
                      ))}
                    </VStack>
                  </Box>
                  
                  <Flex justify="center" py={4} borderTopWidth="1px" borderColor={borderColor}>
                    <HStack>
                      <Button 
                        onClick={() => setPage(prev => Math.max(prev - 1, 1))} 
                        isDisabled={page === 1}
                        leftIcon={<ChevronLeftIcon />}
                        size="sm"
                      >
                        Previous
                      </Button>
                      <Text fontSize="sm" fontWeight="medium">Page {page}</Text>
                      <Button 
                        onClick={() => setPage(prev => prev + 1)} 
                        isDisabled={!hasMore}
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
                  <Icon as={FaTimes} boxSize="40px" color={textColor} mb={4} />
                  <Heading size="md" mb={2}>No Transactions</Heading>
                  <Text>This block doesn't contain any transactions</Text>
                </Box>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Container>
  );
} 