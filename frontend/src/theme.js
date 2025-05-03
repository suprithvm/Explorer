import { extendTheme } from '@chakra-ui/react';

// Color palette inspired by popular blockchain explorers with Supereum branding
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
    50: '#f7fafc',
    100: '#edf2f7',
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
    500: '#38b2ac',
  },
  error: {
    500: '#e53e3e',
  },
  warning: {
    500: '#dd6b20',
  },
  info: {
    500: '#3182ce',
  },
};

// Typography settings
const fonts = {
  heading: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace",
};

// Component-specific styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'md',
    },
    variants: {
      solid: (props) => ({
        bg: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
        color: 'white',
        _hover: {
          bg: props.colorMode === 'dark' ? 'brand.400' : 'brand.600',
        },
      }),
      outline: (props) => ({
        borderColor: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
        color: props.colorMode === 'dark' ? 'brand.500' : 'brand.500',
      }),
      ghost: (props) => ({
        color: props.colorMode === 'dark' ? 'brand.400' : 'brand.500',
      }),
    },
  },
  Card: {
    baseStyle: (props) => ({
      container: {
        bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
        borderRadius: 'lg',
        borderWidth: '1px',
        borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
        boxShadow: 'sm',
        transition: 'all 0.2s',
        _hover: {
          boxShadow: 'md',
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
      },
    }),
  },
  Heading: {
    baseStyle: {
      fontWeight: 'semibold',
    },
  },
  Table: {
    variants: {
      simple: (props) => ({
        th: {
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          fontSize: 'sm',
          fontWeight: 'medium',
        },
        td: {
          borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
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
  },
};

// Global styles
const styles = {
  global: (props) => ({
    body: {
      bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
      color: props.colorMode === 'dark' ? 'white' : 'gray.800',
    },
    // Custom scrollbar
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      bg: props.colorMode === 'dark' ? 'gray.800' : 'gray.100',
    },
    '::-webkit-scrollbar-thumb': {
      bg: props.colorMode === 'dark' ? 'gray.600' : 'gray.400',
      borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      bg: props.colorMode === 'dark' ? 'gray.500' : 'gray.500',
    },
  }),
};

// Layer styles for reusable box styles
const layerStyles = {
  card: {
    bg: 'white',
    _dark: {
      bg: 'gray.800',
    },
    borderRadius: 'lg',
    boxShadow: 'sm',
    p: 6,
  },
  gradientBox: {
    bgGradient: 'linear(to-r, brand.500, secondary.500)',
    color: 'white',
    borderRadius: 'lg',
    p: 6,
  },
  statCard: {
    bg: 'white',
    _dark: {
      bg: 'gray.800',
    },
    borderRadius: 'lg',
    boxShadow: 'sm',
    p: 4,
    transition: 'transform 0.2s',
    _hover: {
      transform: 'translateY(-2px)',
      boxShadow: 'md',
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
  },
  address: {
    fontFamily: 'mono',
    fontSize: 'sm',
    letterSpacing: 'tight',
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