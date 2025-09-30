# Squads Connect - Token Transfer App

A React.js application for connecting to Squads vaults and transferring tokens using Phantom wallet integration.

## Features

- 🔗 Connect to Squads vault using Phantom wallet
- 💰 Transfer SOL and SPL tokens from vault
- 🔐 Multisig transaction support
- 🌐 Mainnet-ready configuration
- 📱 Simple and intuitive UI
- 🔍 Integration with Solscan explorer

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `env.example` to `.env` and update the values:
   ```bash
   cp env.example .env
   ```

   Update the following variables in `.env`:
   - `REACT_APP_SQUAD_VAULT_ADDRESS`: Your Squads vault address
   - `REACT_APP_MULTISIG_ACCOUNT`: Your multisig account address
   - `REACT_APP_RECIPIENT_WALLET`: Default recipient wallet address
   - `REACT_APP_RPC_URL`: Solana RPC endpoint (default: mainnet)

3. **Install Phantom Wallet:**
   - Download and install the [Phantom wallet extension](https://phantom.app/)
   - Create or import your wallet

## Usage

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Connect your wallet:**
   - Click "Connect Phantom Wallet"
   - Approve the connection in Phantom

3. **Transfer tokens:**
   - Enter recipient wallet address
   - Enter amount to transfer
   - Click "Transfer Tokens"
   - Follow the multisig approval process

4. **View on Solscan:**
   - Click "View on Solscan" to see your vault on the blockchain explorer

## Configuration

### Vault Address
Your Squads vault address from the URL: `https://app.squads.so/squads/YOUR_VAULT_ADDRESS/settings`

### Multisig Account
The multisig account associated with your vault for transaction approvals.

### Recipient Wallet
The Solana wallet address that will receive the transferred tokens.

## Security Notes

- This app requires multisig approval for all transfers
- Private keys are never stored or transmitted
- All transactions are signed locally in Phantom wallet
- Vault access requires proper multisig permissions

## Troubleshooting

### Phantom Wallet Not Detected
- Ensure Phantom wallet extension is installed and enabled
- Refresh the page after installing Phantom
- Check that you're using a supported browser

### Connection Issues
- Verify your RPC URL is correct and accessible
- Check that your vault address is valid
- Ensure you have proper permissions for the vault

### Transfer Failures
- Verify recipient address is valid
- Check that vault has sufficient balance
- Ensure multisig threshold requirements are met

## Development

Built with:
- React.js 18
- Solana Web3.js
- Squads SDK
- Phantom Wallet Integration

## License

MIT License
