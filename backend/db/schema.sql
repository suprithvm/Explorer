-- Supereum Explorer Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS supereum_explorer;
USE supereum_explorer;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS network_stats;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS addresses;
DROP TABLE IF EXISTS validators;

-- Create blocks table
CREATE TABLE blocks (
  number BIGINT PRIMARY KEY,
  hash VARCHAR(66) UNIQUE NOT NULL,
  previous_hash VARCHAR(66) NOT NULL,
  timestamp DATETIME NOT NULL,
  mined_by VARCHAR(42) NOT NULL,
  validated_by VARCHAR(42),
  difficulty VARCHAR(66) NOT NULL,
  total_difficulty VARCHAR(66) NOT NULL,
  size INT NOT NULL,
  gas_used BIGINT NOT NULL,
  gas_limit BIGINT NOT NULL,
  extra_data TEXT,
  nonce VARCHAR(18),
  is_pow BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_miner (mined_by),
  INDEX idx_validator (validated_by)
) ENGINE=InnoDB;

-- Create transactions table
CREATE TABLE transactions (
  id VARCHAR(66) PRIMARY KEY,
  block_number BIGINT NOT NULL,
  block_hash VARCHAR(66) NOT NULL,
  sender VARCHAR(42) NOT NULL,
  receiver VARCHAR(42),
  amount DECIMAL(36, 18) DEFAULT 0,
  timestamp DATETIME NOT NULL,
  gas_fee DECIMAL(36, 18) DEFAULT 0,
  gas_price DECIMAL(36, 18) DEFAULT 0,
  gas_used BIGINT DEFAULT 0,
  data TEXT,
  tx_type VARCHAR(20) DEFAULT 'transfer',
  status VARCHAR(20) DEFAULT 'confirmed',
  contract_address VARCHAR(42),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_block_number (block_number),
  INDEX idx_sender (sender),
  INDEX idx_receiver (receiver),
  INDEX idx_timestamp (timestamp),
  INDEX idx_contract (contract_address),
  FOREIGN KEY (block_number) REFERENCES blocks(number) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Create addresses table
CREATE TABLE addresses (
  address VARCHAR(42) PRIMARY KEY,
  balance DECIMAL(36, 18) DEFAULT 0,
  nonce BIGINT DEFAULT 0,
  total_received DECIMAL(36, 18) DEFAULT 0,
  total_sent DECIMAL(36, 18) DEFAULT 0,
  tx_count INT DEFAULT 0,
  is_contract BOOLEAN DEFAULT 0,
  contract_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_balance (balance),
  INDEX idx_tx_count (tx_count)
) ENGINE=InnoDB;

-- Create validators table
CREATE TABLE validators (
  address VARCHAR(42) PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'active',
  total_stake DECIMAL(36, 18) DEFAULT 0,
  voting_power DECIMAL(10, 2) DEFAULT 0,
  blocks_validated INT DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 0,
  uptime DECIMAL(5, 2) DEFAULT 100.0,
  is_slashed BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (address) REFERENCES addresses(address) ON DELETE CASCADE,
  INDEX idx_stake (total_stake),
  INDEX idx_blocks_validated (blocks_validated)
) ENGINE=InnoDB;

-- Create network statistics table
CREATE TABLE network_stats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  active_validators INT DEFAULT 0,
  total_stake DECIMAL(36, 18) DEFAULT 0,
  total_blocks BIGINT DEFAULT 0,
  total_transactions BIGINT DEFAULT 0,
  average_block_time DECIMAL(10, 2) DEFAULT 0,
  difficulty VARCHAR(66) DEFAULT '0',
  gas_price DECIMAL(36, 18) DEFAULT 1000000000,
  tps DECIMAL(10, 2) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_last_updated (last_updated)
) ENGINE=InnoDB;

-- Insert initial network statistics
INSERT INTO network_stats (id, active_validators, total_stake, total_blocks, total_transactions, average_block_time)
VALUES (1, 0, 0, 0, 0, 15.0);

-- Create database functions
DELIMITER //

-- Function to update address balance and transaction count
CREATE PROCEDURE update_address_stats(IN addr VARCHAR(42), IN amount DECIMAL(36, 18), IN is_receiver BOOLEAN)
BEGIN
  INSERT INTO addresses (address, balance, tx_count)
  VALUES (addr, IF(is_receiver, amount, 0), 1)
  ON DUPLICATE KEY UPDATE
    balance = IF(is_receiver, balance + amount, balance - amount),
    tx_count = tx_count + 1,
    total_received = IF(is_receiver, total_received + amount, total_received),
    total_sent = IF(NOT is_receiver, total_sent + amount, total_sent);
END //

DELIMITER ; 