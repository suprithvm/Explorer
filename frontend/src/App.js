import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import NotFoundPage from './pages/NotFoundPage';
import { WebSocketProvider } from './contexts/WebSocketContext';

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
              <Route path="/block/:identifier" element={<BlockPage />} />
              <Route path="/transactions" element={<TransactionsPage />} />
              <Route path="/tx/:hash" element={<TransactionPage />} />
              <Route path="/address/:address" element={<AddressPage />} />
              <Route path="/validators" element={<ValidatorsPage />} />
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
 