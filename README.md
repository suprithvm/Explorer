# Supereum Blockchain Explorer

A comprehensive blockchain explorer for the Supereum blockchain. The explorer allows users to view blocks, transactions, addresses, and validators.

## Architecture

The Supereum Explorer consists of two main components:

1. **Backend**: Node.js server that connects to a Supereum blockchain node via RPC and WebSocket to fetch and store blockchain data in a MySQL database.
2. **Frontend**: React.js web application that provides a user-friendly interface to explore the blockchain data.

## Features

- Real-time updates via WebSocket
- Detailed view of blocks and transactions
- Address details with balance and transaction history
- Validator information and statistics
- Network statistics and health monitoring
- Responsive design for desktop and mobile

## Prerequisites

- Node.js v16 or higher
- MySQL 8.0 or higher
- A running Supereum blockchain node with RPC/WebSocket endpoints enabled

## Installation

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd Explorer/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following configuration:
   ```
   PORT=3001
   NODE_RPC_URL=http://localhost:8545
   NODE_WS_URL=ws://localhost:8546
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=supereum_explorer
   ```

4. Create the database:
   ```
   mysql -u root -p -e "CREATE DATABASE supereum_explorer;"
   ```

5. Import the schema:
   ```
   mysql -u root -p supereum_explorer < db/schema.sql
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd Explorer/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the following configuration:
   ```
   REACT_APP_API_URL=http://localhost:3001/api
   REACT_APP_WS_URL=ws://localhost:3001/ws
   ```

## Running the Explorer

### Start the Backend

1. Navigate to the backend directory:
   ```
   cd Explorer/backend
   ```

2. Start the server:
   ```
   npm start
   ```

### Start the Frontend

1. Navigate to the frontend directory:
   ```
   cd Explorer/frontend
   ```

2. Start the development server:
   ```
   npm start
   ```

3. Open your browser and go to [http://localhost:3000](http://localhost:3000)

## Production Deployment

For production deployment, build the frontend:

```
cd Explorer/frontend
npm run build
```

Then serve the built files with a web server like Nginx.

## License

This project is licensed under the MIT License. 