import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import BlockPage from './pages/BlockPage';
import TransactionPage from './pages/TransactionPage';
import AddressPage from './pages/AddressPage';
import BlocksPage from './pages/BlocksPage';
import TransactionsPage from './pages/TransactionsPage';
import ValidatorsPage from './pages/ValidatorsPage';
import TestBlockCard from './pages/TestBlockCard';
import NotFoundPage from './pages/NotFoundPage';
import { WebSocketProvider } from './contexts/WebSocketContext';

// Wrapper component that provides route location to create keys
function RouteWrapper({ element }) {
  const location = useLocation();
  return React.cloneElement(element, { key: location.pathname });
}

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <Box minH="100vh" display="flex" flexDirection="column">
          <Header />
          <Box flex="1" py={8}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blocks" element={<BlocksPage />} />
              <Route path="/block/:identifier" element={<RouteWrapper element={<BlockPage />} />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/tx/:hash" element={<RouteWrapper element={<TransactionPage />} />} />
              <Route path="/address/:address" element={<RouteWrapper element={<AddressPage />} />} />
              <Route path="/validators" element={<ValidatorsPage />} />
              <Route path="/test-block-card" element={<TestBlockCard />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Box>
          <Footer />
        </Box>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
 