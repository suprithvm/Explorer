import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Image,
  useColorModeValue,
} from '@chakra-ui/react';

export default function NotFoundPage() {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  
  return (
    <Container maxW="container.xl" py={12}>
      <Box 
        bg={bgColor} 
        p={8} 
        borderRadius="lg" 
        textAlign="center"
      >
        <VStack spacing={6}>
          <Heading as="h1" size="2xl">404</Heading>
          <Heading as="h2" size="xl">Page Not Found</Heading>
          
          <Text fontSize="lg">
            The page you're looking for doesn't exist or has been moved.
          </Text>
          
          <Button 
            as={RouterLink} 
            to="/" 
            colorScheme="blue" 
            size="lg"
            mt={4}
          >
            Return to Home
          </Button>
        </VStack>
      </Box>
    </Container>
  );
} 