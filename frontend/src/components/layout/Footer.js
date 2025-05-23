import React from 'react';
import {
  Box,
  chakra,
  Container,
  Stack,
  Text,
  useColorModeValue,
  VisuallyHidden,
  Link,
  Divider,
} from '@chakra-ui/react';
import { FaGithub, FaTwitter, FaDiscord } from 'react-icons/fa';

const SocialButton = ({ children, label, href }) => {
  return (
    <chakra.button
      bg={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
      rounded={'full'}
      w={8}
      h={8}
      cursor={'pointer'}
      as={'a'}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      display={'inline-flex'}
      alignItems={'center'}
      justifyContent={'center'}
      transition={'background 0.3s ease'}
      _hover={{
        bg: useColorModeValue('blackAlpha.200', 'whiteAlpha.200'),
      }}
    >
      <VisuallyHidden>{label}</VisuallyHidden>
      {children}
    </chakra.button>
  );
};

export default function Footer() {
  return (
    <Box
      bg={useColorModeValue('gray.50', 'gray.900')}
      color={useColorModeValue('gray.700', 'gray.200')}
      mt="auto"
      borderTop={1}
      borderStyle={'solid'}
      borderColor={useColorModeValue('gray.200', 'gray.700')}
    >
      <Container
        as={Stack}
        maxW={'6xl'}
        py={4}
        direction={{ base: 'column', md: 'row' }}
        spacing={4}
        justify={{ base: 'center', md: 'space-between' }}
        align={{ base: 'center', md: 'center' }}
      >
        <Text>
          © {new Date().getFullYear()} Supereum Blockchain Explorer. All rights reserved.
        </Text>
        <Stack direction={'row'} spacing={6}>
          <SocialButton label={'Twitter'} href={'#'}>
            <FaTwitter />
          </SocialButton>
          <SocialButton label={'Discord'} href={'#'}>
            <FaDiscord />
          </SocialButton>
          <SocialButton label={'GitHub'} href={'#'}>
            <FaGithub />
          </SocialButton>
        </Stack>
      </Container>
      <Divider />
      <Container maxW={'6xl'} py={4}>
        <Stack direction={{ base: 'column', md: 'row' }} spacing={6} justify="center" fontSize="sm">
          <Link href="#" _hover={{ color: 'blue.500' }}>
            API Documentation
          </Link>
          <Link href="#" _hover={{ color: 'blue.500' }}>
            About Supereum
          </Link>
          <Link href="#" _hover={{ color: 'blue.500' }}>
            FAQs
          </Link>
          <Link href="#" _hover={{ color: 'blue.500' }}>
            Privacy Policy
          </Link>
          <Link href="#" _hover={{ color: 'blue.500' }}>
            Terms of Service
          </Link>
        </Stack>
      </Container>
    </Box>
  );
} 