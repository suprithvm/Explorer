import { extendTheme } from '@chakra-ui/react';

// Enhanced color palette with more vibrant and modern colors
const colors = {
  brand: {
    50: '#e6f7ff',
    100: '#b3e0ff',
    200: '#80c9ff',
    300: '#4db2ff',
    400: '#1a9bff',
    500: '#0084e6', // Primary Supereum blue
    600: '#0068b5',
    700: '#004d85',
    800: '#003155',
    900: '#001525',
  },
  secondary: {
    50: '#e5f6ed',
    100: '#c2e9d2',
    200: '#9bdcb6',
    300: '#70ce99',
    400: '#48c07d',
    500: '#2bad62', // Secondary Supereum green
    600: '#1e8d4e',
    700: '#146e3a',
    800: '#0a4f27',
    900: '#002f14',
  },
  accent: {
    50: '#fff3dc',
    100: '#ffe1b0',
    200: '#ffd080',
    300: '#ffbf4f',
    400: '#ffae1f',
    500: '#f59c00', // Accent Supereum amber
    600: '#cc7c00',
    700: '#a35d00',
    800: '#7a3e00',
    900: '#522000',
  },
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e0',
    400: '#a0aec0',
    500: '#718096',
    600: '#4a5568',
    700: '#2d3748',
    800: '#1a202c',
    900: '#0d1117', // Dark background
  },
  success: {
    500: '#10b981',
    600: '#059669',
  },
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706',
  },
  info: {
    500: '#3b82f6',
    600: '#2563eb',
  },
};

// Typography settings with more modern font stack
const fonts = {
  heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
};

// Component-specific styles with enhanced aesthetics
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'md',
      _focus: {
        boxShadow: 'none',
      },
    },
    variants: {
      solid: (props) => ({
        bg: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
        color: 'white',
        _hover: {
          bg: props.colorMode === 'dark' ? 'brand.400' : 'brand.600',
          transform: 'translateY(-2px)',
          boxShadow: 'md',
        },
        transition: 'all 0.2s',
      }),
      outline: (props) => ({
        borderColor: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
        color: props.colorMode === 'dark' ? 'brand.400' : 'brand.500',
        _hover: {
          bg: props.colorMode === 'dark' ? 'rgba(26, 155, 255, 0.1)' : 'rgba(0, 132, 230, 0.1)',
        },
      }),
      ghost: (props) => ({
        color: props.colorMode === 'dark' ? 'brand.400' : 'brand.500',
        _hover: {
          bg: props.colorMode === 'dark' ? 'rgba(26, 155, 255, 0.1)' : 'rgba(0, 132, 230, 0.1)',
        },
      }),
      glass: (props) => ({
        bg: props.colorMode === 'dark' ? 'rgba(26, 32, 44, 0.7)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
        borderWidth: '1px',
        borderColor: props.colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        _hover: {
          bg: props.colorMode === 'dark' ? 'rgba(26, 32, 44, 0.8)' : 'rgba(255, 255, 255, 0.9)',
        },
      }),
    },
  },
  Card: {
    baseStyle: (props) => ({
      container: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        borderRadius: 'xl',
        borderWidth: '1px',
        borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        boxShadow: props.colorMode === 'dark' ? 
          '0 4px 20px rgba(0, 0, 0, 0.25)' : 
          '0 4px 20px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s',
        _hover: {
          transform: 'translateY(-4px)',
          boxShadow: props.colorMode === 'dark' ? 
            '0 10px 25px rgba(0, 0, 0, 0.3)' : 
            '0 10px 25px rgba(0, 0, 0, 0.1)',
          borderColor: props.colorMode === 'dark' ? 'gray.600' : 'gray.300',
        },
      },
    }),
  },
  Link: {
    baseStyle: (props) => ({
      color: props.colorMode === 'dark' ? 'brand.400' : 'brand.500',
      _hover: {
        textDecoration: 'none',
        color: props.colorMode === 'dark' ? 'brand.300' : 'brand.600',
      },
      transition: 'all 0.2s',
    }),
  },
  Heading: {
    baseStyle: {
      fontWeight: 'semibold',
    },
    variants: {
      gradient: {
        bgGradient: 'linear(to-r, brand.500, secondary.500)',
        bgClip: 'text',
      },
    }
  },
  Table: {
    variants: {
      simple: (props) => ({
        th: {
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          fontSize: 'sm',
          fontWeight: 'medium',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: props.colorMode === 'dark' ? 'gray.400' : 'gray.500',
        },
        td: {
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          py: 3,
        },
        tbody: {
          tr: {
            transition: 'all 0.2s',
            _hover: {
              bg: props.colorMode === 'dark' ? 'gray.750' : 'gray.50',
            },
          },
        },
      }),
    },
  },
  Badge: {
    baseStyle: {
      borderRadius: 'full',
      textTransform: 'none',
      fontWeight: 'medium',
    },
    variants: {
      glass: (props) => ({
        bg: props.colorMode === 'dark' ? 'rgba(26, 32, 44, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(8px)',
        borderWidth: '1px',
        borderColor: props.colorMode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      }),
    },
  },
  Tooltip: {
    baseStyle: (props) => ({
      bg: props.colorMode === 'dark' ? 'gray.700' : 'gray.900',
      color: 'white',
      fontSize: 'sm',
      borderRadius: 'md',
      px: 3,
      py: 2,
    }),
  },
};

// Global styles with improved scrollbar and transitions
const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      color: props.colorMode === 'dark' ? 'white' : 'gray.800',
      transition: 'background-color 0.2s',
    },
    // Modern scrollbar
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
      bg: props.colorMode === 'dark' ? 'gray.600' : 'gray.400',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      bg: props.colorMode === 'dark' ? 'gray.500' : 'gray.500',
    },
    // Smooth scrolling
    html: {
      scrollBehavior: 'smooth',
    },
  }),
};

// Layer styles with glass morphism and gradients
const layerStyles = {
  card: {
    bg: 'white',
    _dark: {
      bg: 'gray.800',
    },
    borderRadius: 'xl',
    boxShadow: 'sm',
    p: 6,
    transition: 'all 0.3s',
    _hover: {
      transform: 'translateY(-4px)',
      boxShadow: 'lg',
    },
  },
  glassMorphism: {
    bg: 'rgba(255, 255, 255, 0.8)',
    _dark: {
      bg: 'rgba(26, 32, 44, 0.7)',
    },
    backdropFilter: 'blur(8px)',
    borderRadius: 'xl',
    borderWidth: '1px',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    _dark: {
      borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    _dark: {
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    },
  },
  gradientBox: {
    bgGradient: 'linear(to-r, brand.500, secondary.500)',
    color: 'white',
    borderRadius: 'xl',
    p: 6,
    boxShadow: '0 4px 20px rgba(0, 132, 230, 0.3)',
  },
  statCard: {
    bg: 'white',
    _dark: {
      bg: 'gray.800',
    },
    borderRadius: 'xl',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    _dark: {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    },
    p: 4,
    transition: 'transform 0.3s, box-shadow 0.3s',
    _hover: {
      transform: 'translateY(-5px)',
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
      _dark: {
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.3)',
      },
    },
  },
};

// Text styles for consistent typography
const textStyles = {
  muted: {
    color: 'gray.500',
    fontSize: 'sm',
  },
  mono: {
    fontFamily: 'mono',
    fontSize: 'sm',
    letterSpacing: '-0.5px',
  },
  address: {
    fontFamily: 'mono',
    fontSize: 'sm',
    letterSpacing: '-0.3px',
    fontWeight: 'medium',
  },
  gradient: {
    bgGradient: 'linear(to-r, brand.500, secondary.500)',
    bgClip: 'text',
    fontWeight: 'bold',
  },
};

// Blur backdrop for modals and popovers
const blur = {
  backdropFilter: 'blur(8px)',
};

// Config for initial color mode
const config = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

// Create the extended theme
const theme = extendTheme({
  colors,
  fonts,
  components,
  styles,
  layerStyles,
  textStyles,
  blur,
  config,
});

export default theme; 