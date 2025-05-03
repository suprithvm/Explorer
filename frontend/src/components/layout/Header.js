import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Button,
  Stack,
  Collapse,
  Icon,
  Link,
  Popover,
  PopoverTrigger,
  PopoverContent,
  useColorModeValue,
  useBreakpointValue,
  useDisclosure,
  Input,
  InputGroup,
  InputRightElement,
  Badge,
  HStack,
  Container,
  useColorMode,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Divider,
  Skeleton,
  Image,
} from '@chakra-ui/react';
import {
  HamburgerIcon,
  CloseIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  SearchIcon,
  MoonIcon,
  SunIcon,
  InfoOutlineIcon,
  ExternalLinkIcon,
} from '@chakra-ui/icons';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getNetworkStats } from '../../services/api';

export default function Header() {
  const { isOpen, onToggle } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState('');
  const [networkStats, setNetworkStats] = useState(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const { isConnected, lastBlock } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { colorMode, toggleColorMode } = useColorMode();

  // Brand colors
  const brandColor = useColorModeValue('brand.500', 'brand.400');
  const searchBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBgColor = useColorModeValue('white', 'gray.900');
  const boxShadowColor = useColorModeValue(
    '0 2px 10px rgba(0, 0, 0, 0.05)',
    '0 2px 10px rgba(0, 0, 0, 0.2)'
  );

  // Active link styles
  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  // Logo text or image
  const Logo = () => (
    <Flex align="center">
      <Icon
        viewBox="0 0 24 24"
        height="28px"
        width="28px"
        color={brandColor}
        mr={2}
      >
        <path
          fill="currentColor"
          d="M12 2L4 6v12l8 4 8-4V6l-8-4zm6 15.5l-6 3-6-3v-2.5l6 3 6-3v2.5zm0-5l-6 3-6-3v-2.5l6 3 6-3v2.5z"
        />
      </Icon>
      <Text
        textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
        fontFamily="heading"
        fontWeight="bold"
        fontSize={{ base: 'xl', md: '2xl' }}
        bgGradient={`linear(to-r, ${brandColor}, secondary.500)`}
        bgClip="text"
      >
        Supereum
      </Text>
    </Flex>
  );

  useEffect(() => {
    const fetchNetworkStats = async () => {
      setIsStatsLoading(true);
      try {
        const stats = await getNetworkStats();
        setNetworkStats(stats);
      } catch (error) {
        console.error('Failed to fetch network stats:', error);
      } finally {
        setIsStatsLoading(false);
      }
    };

    fetchNetworkStats();
    const interval = setInterval(fetchNetworkStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Update stats when new block comes in
  useEffect(() => {
    if (lastBlock && networkStats) {
      setNetworkStats((prev) => ({
        ...prev,
        blockNumber: lastBlock.number,
        total_blocks: prev.total_blocks + 1,
      }));
    }
  }, [lastBlock, networkStats]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg={headerBgColor}
      boxShadow={boxShadowColor}
    >
      <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
        <Flex
          color={useColorModeValue('gray.600', 'white')}
          minH={'60px'}
          py={{ base: 2 }}
          align={'center'}
          justify="space-between"
        >
          {/* Mobile menu button */}
          <Flex
            flex={{ base: 1, md: 'auto' }}
            ml={{ base: -2 }}
            display={{ base: 'flex', md: 'none' }}
          >
            <IconButton
              onClick={onToggle}
              icon={
                isOpen ? <CloseIcon w={3} h={3} /> : <HamburgerIcon w={5} h={5} />
              }
              variant={'ghost'}
              aria-label={'Toggle Navigation'}
            />
          </Flex>
          
          {/* Logo */}
          <Link
            as={RouterLink}
            to="/"
            _hover={{ textDecoration: 'none' }}
            mr={{ md: 8 }}
          >
            <Logo />
          </Link>

          {/* Desktop Navigation */}
          <Flex display={{ base: 'none', md: 'flex' }} flex={1}>
            <DesktopNav isActiveLink={isActiveLink} />
          </Flex>

          {/* Right side elements */}
          <Stack
            flex={{ base: 1, md: 1 }}
            justify={'flex-end'}
            direction={'row'}
            spacing={{ base: 2, md: 4 }}
            align="center"
          >
            {/* Network Stats */}
            <Flex display={{ base: 'none', md: 'flex' }} alignItems="center">
              {isStatsLoading ? (
                <Skeleton height="24px" width="160px" />
              ) : networkStats ? (
                <HStack spacing={4}>
                  <Tooltip
                    label={`Latest Block: ${networkStats.blockNumber}`}
                    placement="bottom"
                    hasArrow
                  >
                    <Badge 
                      colorScheme="green" 
                      variant="solid"
                      fontSize="0.8em" 
                      borderRadius="full" 
                      px={2} 
                      py={1}
                      cursor="pointer"
                      onClick={() => navigate(`/block/${networkStats.blockNumber}`)}
                    >
                      Block: {networkStats.blockNumber}
                    </Badge>
                  </Tooltip>
                  <Tooltip
                    label={isConnected ? "Connected to blockchain" : "Disconnected from blockchain"}
                    placement="bottom"
                    hasArrow
                  >
                    <Badge 
                      colorScheme={isConnected ? 'green' : 'red'} 
                      variant="outline"
                      fontSize="0.8em" 
                      borderRadius="full" 
                      px={2} 
                      py={1}
                    >
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </Tooltip>
                </HStack>
              ) : null}
            </Flex>
            
            {/* Search Bar */}
            <Box maxW={{ base: '150px', sm: '220px', md: '300px' }} w="full">
              <form onSubmit={handleSearch}>
                <InputGroup size="sm">
                  <Input
                    placeholder="Search by block, tx, address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    borderRadius="full"
                    bg={searchBgColor}
                    borderColor={borderColor}
                    _hover={{ borderColor: 'brand.500' }}
                    _focus={{ borderColor: 'brand.500', boxShadow: `0 0 0 1px ${brandColor}` }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label="Search"
                      icon={<SearchIcon />}
                      size="sm"
                      borderRadius="full"
                      colorScheme="brand"
                      type="submit"
                    />
                  </InputRightElement>
                </InputGroup>
              </form>
            </Box>
            
            {/* Color Mode Toggle */}
            <Tooltip
              label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              placement="bottom"
              hasArrow
            >
              <IconButton
                aria-label="Toggle color mode"
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                colorScheme="brand"
                size="sm"
              />
            </Tooltip>
          </Stack>
        </Flex>

        <Collapse in={isOpen} animateOpacity>
          <MobileNav />
        </Collapse>
      </Container>
    </Box>
  );
}

const DesktopNav = ({ isActiveLink }) => {
  const linkColor = useColorModeValue('gray.600', 'gray.200');
  const linkHoverColor = useColorModeValue('gray.800', 'white');
  const activeLinkColor = useColorModeValue('brand.500', 'brand.400');
  const popoverContentBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Stack direction={'row'} spacing={4}>
      {NAV_ITEMS.map((navItem) => (
        <Box key={navItem.label}>
          <Popover trigger={'hover'} placement={'bottom-start'} strategy="fixed">
            <PopoverTrigger>
              <Link
                p={2}
                href={navItem.href ?? '#'}
                fontSize={'sm'}
                fontWeight={500}
                color={isActiveLink(navItem.href) ? activeLinkColor : linkColor}
                _hover={{
                  textDecoration: 'none',
                  color: linkHoverColor,
                }}
                as={RouterLink}
                to={navItem.href}
                position="relative"
                _after={isActiveLink(navItem.href) ? {
                  content: '""',
                  position: 'absolute',
                  bottom: '0',
                  left: '0',
                  right: '0',
                  height: '2px',
                  bg: activeLinkColor,
                  borderRadius: 'full',
                } : {}}
              >
                {navItem.label}
              </Link>
            </PopoverTrigger>

            {navItem.children && (
              <PopoverContent
                border={0}
                boxShadow={'xl'}
                bg={popoverContentBgColor}
                p={4}
                rounded={'xl'}
                minW={'sm'}
                borderWidth="1px"
                borderColor={borderColor}
              >
                <Stack>
                  {navItem.children.map((child) => (
                    <DesktopSubNav key={child.label} {...child} isActive={isActiveLink(child.href)} />
                  ))}
                </Stack>
              </PopoverContent>
            )}
          </Popover>
        </Box>
      ))}
    </Stack>
  );
};

const DesktopSubNav = ({ label, href, subLabel, isActive }) => {
  const activeLinkColor = useColorModeValue('brand.500', 'brand.400');
  
  return (
    <Link
      as={RouterLink}
      to={href}
      role={'group'}
      display={'block'}
      p={2}
      rounded={'md'}
      _hover={{ bg: useColorModeValue('brand.50', 'gray.900') }}
      color={isActive ? activeLinkColor : 'inherit'}
    >
      <Stack direction={'row'} align={'center'}>
        <Box>
          <Text
            transition={'all .3s ease'}
            _groupHover={{ color: activeLinkColor }}
            fontWeight={500}
          >
            {label}
          </Text>
          <Text fontSize={'sm'}>{subLabel}</Text>
        </Box>
        <Flex
          transition={'all .3s ease'}
          transform={'translateX(-10px)'}
          opacity={0}
          _groupHover={{ opacity: '100%', transform: 'translateX(0)' }}
          justify={'flex-end'}
          align={'center'}
          flex={1}
        >
          <Icon color={activeLinkColor} w={5} h={5} as={ChevronRightIcon} />
        </Flex>
      </Stack>
    </Link>
  );
};

const MobileNav = () => {
  const bgColor = useColorModeValue('white', 'gray.900');
  
  return (
    <Stack
      bg={bgColor}
      p={4}
      display={{ md: 'none' }}
      borderTopWidth="1px"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      {NAV_ITEMS.map((navItem) => (
        <MobileNavItem key={navItem.label} {...navItem} />
      ))}
    </Stack>
  );
};

const MobileNavItem = ({ label, children, href }) => {
  const { isOpen, onToggle } = useDisclosure();
  const activeLinkColor = useColorModeValue('brand.500', 'brand.400');
  const { pathname } = useLocation();
  const isActive = pathname === href;

  return (
    <Stack spacing={4} onClick={children && onToggle}>
      <Flex
        py={2}
        as={RouterLink}
        to={href ?? '#'}
        justify={'space-between'}
        align={'center'}
        _hover={{
          textDecoration: 'none',
        }}
      >
        <Text
          fontWeight={600}
          color={isActive ? activeLinkColor : useColorModeValue('gray.600', 'gray.200')}
        >
          {label}
        </Text>
        {children && (
          <Icon
            as={ChevronDownIcon}
            transition={'all .25s ease-in-out'}
            transform={isOpen ? 'rotate(180deg)' : ''}
            w={6}
            h={6}
          />
        )}
      </Flex>

      <Collapse in={isOpen} animateOpacity style={{ marginTop: '0!important' }}>
        <Stack
          mt={2}
          pl={4}
          borderLeft={1}
          borderStyle={'solid'}
          borderColor={useColorModeValue('gray.200', 'gray.700')}
          align={'start'}
        >
          {children &&
            children.map((child) => (
              <Link 
                key={child.label} 
                py={2} 
                as={RouterLink} 
                to={child.href}
                color={pathname === child.href ? activeLinkColor : 'inherit'}
              >
                {child.label}
              </Link>
            ))}
        </Stack>
      </Collapse>
    </Stack>
  );
};

const NAV_ITEMS = [
  {
    label: 'Blocks',
    href: '/blocks',
  },
  {
    label: 'Transactions',
    href: '/transactions',
  },
  {
    label: 'Validators',
    href: '/validators',
  },
  {
    label: 'Resources',
    href: '#',
    children: [
      {
        label: 'API Docs',
        subLabel: 'Integrate with Supereum Explorer',
        href: '#',
      },
      {
        label: 'About Supereum',
        subLabel: 'Learn about the blockchain',
        href: '#',
      },
    ],
  },
]; 