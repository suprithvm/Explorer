import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
} from '@chakra-ui/react';
import { CopyIcon, CheckIcon } from '@chakra-ui/icons';
import { getAddressDetails, getAddressTransactions, getAddressBlocks } from '../services/api';
import TransactionCard from '../components/transactions/TransactionCard';
import BlockCard from '../components/blocks/BlockCard';

export default function AddressPage() {
  const { address } = useParams();
  const [addressData, setAddressData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [blocks, setBlocks] = useState([]);
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

  useEffect(() => {
    const fetchAddressData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await getAddressDetails(address);
        setAddressData(data);
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
        const txData = await getAddressTransactions(address, txPage, 10);
        setTransactions(txData.data);
        setHasMoreTx(txData.pagination.hasNext);
      } catch (err) {
        console.error('Error fetching address transactions:', err);
      }
    };
    
    fetchTransactions();
  }, [address, txPage, activeTab]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (activeTab !== 1) return;
      
      try {
        const blockData = await getAddressBlocks(address, blockPage, 10);
        setBlocks(blockData.data);
        setHasMoreBlocks(blockData.pagination.hasNext);
      } catch (err) {
        console.error('Error fetching address blocks:', err);
      }
    };
    
    fetchBlocks();
  }, [address, blockPage, activeTab]);

  // Format value from wei to SUP
  const formatValue = (value) => {
    if (!value) return '0 SUP';
    const valueInEth = parseFloat(value) / 1e18;
    return `${valueInEth.toFixed(6)} SUP`;
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Skeleton height="50px" mb={4} />
        <Skeleton height="200px" mb={8} />
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

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={6}>
        <Heading as="h1" size="lg" mb={2}>
          Address Details
        </Heading>
        <Flex align="center">
          <Text fontSize="md" fontFamily="monospace" wordBreak="break-all">
            {address}
          </Text>
          <Tooltip label={hasCopied ? 'Copied!' : 'Copy Address'} closeOnClick={false}>
            <IconButton
              aria-label="Copy address"
              icon={hasCopied ? <CheckIcon /> : <CopyIcon />}
              size="sm"
              ml={2}
              onClick={onCopy}
              variant="ghost"
            />
          </Tooltip>
        </Flex>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
          <StatLabel>Balance</StatLabel>
          <StatNumber>{formatValue(addressData?.balance || '0')}</StatNumber>
          <StatHelpText>Current balance</StatHelpText>
        </Stat>
        
        <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
          <StatLabel>Transactions</StatLabel>
          <StatNumber>{addressData?.txCount || 0}</StatNumber>
          <StatHelpText>Total transactions</StatHelpText>
        </Stat>
        
        {addressData?.isValidator && (
          <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
            <StatLabel>Validator Status</StatLabel>
            <StatNumber>
              <Badge colorScheme={addressData.isActiveValidator ? 'green' : 'gray'}>
                {addressData.isActiveValidator ? 'Active' : 'Inactive'}
              </Badge>
            </StatNumber>
            <StatHelpText>Staked: {formatValue(addressData.stakedAmount || '0')}</StatHelpText>
          </Stat>
        )}
        
        {addressData?.isMiner && (
          <Stat p={4} bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="sm">
            <StatLabel>Miner Status</StatLabel>
            <StatNumber>{addressData.minedBlocks || 0}</StatNumber>
            <StatHelpText>Blocks mined</StatHelpText>
          </Stat>
        )}
      </SimpleGrid>

      <Box bg={bgColor} borderRadius="lg" borderWidth="1px" borderColor={borderColor} boxShadow="md" overflow="hidden">
        <Tabs isFitted variant="enclosed" onChange={(index) => setActiveTab(index)}>
          <TabList>
            <Tab>Transactions ({addressData?.txCount || 0})</Tab>
            {(addressData?.isMiner || addressData?.isValidator) && (
              <Tab>Blocks ({addressData?.minedBlocks || 0})</Tab>
            )}
          </TabList>
          
          <TabPanels>
            <TabPanel p={4}>
              {transactions.length > 0 ? (
                <>
                  <VStack spacing={4} align="stretch">
                    {transactions.map(tx => (
                      <TransactionCard key={tx.hash} transaction={tx} />
                    ))}
                  </VStack>
                  
                  <Flex justify="center" mt={6}>
                    <HStack>
                      <Button 
                        onClick={() => setTxPage(prev => Math.max(prev - 1, 1))} 
                        isDisabled={txPage === 1}
                      >
                        Previous
                      </Button>
                      <Text>Page {txPage}</Text>
                      <Button 
                        onClick={() => setTxPage(prev => prev + 1)} 
                        isDisabled={!hasMoreTx}
                      >
                        Next
                      </Button>
                    </HStack>
                  </Flex>
                </>
              ) : (
                <Box textAlign="center" py={8}>
                  <Text>No transactions found for this address</Text>
                </Box>
              )}
            </TabPanel>
            
            {(addressData?.isMiner || addressData?.isValidator) && (
              <TabPanel p={4}>
                {blocks.length > 0 ? (
                  <>
                    <VStack spacing={4} align="stretch">
                      {blocks.map(block => (
                        <BlockCard key={block.hash} block={block} />
                      ))}
                    </VStack>
                    
                    <Flex justify="center" mt={6}>
                      <HStack>
                        <Button 
                          onClick={() => setBlockPage(prev => Math.max(prev - 1, 1))} 
                          isDisabled={blockPage === 1}
                        >
                          Previous
                        </Button>
                        <Text>Page {blockPage}</Text>
                        <Button 
                          onClick={() => setBlockPage(prev => prev + 1)} 
                          isDisabled={!hasMoreBlocks}
                        >
                          Next
                        </Button>
                      </HStack>
                    </Flex>
                  </>
                ) : (
                  <Box textAlign="center" py={8}>
                    <Text>No blocks found for this address</Text>
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