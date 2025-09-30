import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Squads } from '@squads-io/squads-sdk';
import './App.css';

function App() {
  const [connection, setConnection] = useState(null);
  const [squads, setSquads] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [vaultInfo, setVaultInfo] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');

  // Environment variables
  const vaultAddress = process.env.REACT_APP_SQUAD_VAULT_ADDRESS;
  const multisigAccount = process.env.REACT_APP_MULTISIG_ACCOUNT;
  const defaultRecipient = process.env.REACT_APP_RECIPIENT_WALLET;
  const rpcUrl = process.env.REACT_APP_RPC_URL || 'https://api.mainnet-beta.solana.com';

  useEffect(() => {
    // Initialize connection
    const conn = new Connection(rpcUrl, 'confirmed');
    setConnection(conn);
    
    // Set default recipient if available
    if (defaultRecipient) {
      setRecipientAddress(defaultRecipient);
    }

    // Check if Phantom wallet is available
    if (window.solana && window.solana.isPhantom) {
      setWallet(window.solana);
    } else {
      setStatus('Phantom wallet not detected. Please install Phantom wallet extension.');
    }
  }, []);

  const connectWallet = async () => {
    if (!wallet) {
      setStatus('Phantom wallet not available. Please install the extension.');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Connecting to Phantom wallet...');

      const response = await wallet.connect();
      const publicKey = new PublicKey(response.publicKey.toString());
      
      setIsConnected(true);
      setStatus(`Connected to wallet: ${publicKey.toString()}`);
      
      // Initialize Squads SDK
      const squadsInstance = new Squads(connection, publicKey);
      setSquads(squadsInstance);
      
      // Load vault information
      await loadVaultInfo(squadsInstance);
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStatus(`Error connecting wallet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVaultInfo = async (squadsInstance) => {
    try {
      if (!vaultAddress) {
        setStatus('Vault address not configured in environment variables.');
        return;
      }

      const vaultPubkey = new PublicKey(vaultAddress);
      
      // Get vault details
      const vaultDetails = await squadsInstance.getMultisig(vaultPubkey);
      
      setVaultInfo({
        address: vaultAddress,
        threshold: vaultDetails.threshold,
        members: vaultDetails.members,
        version: vaultDetails.version
      });

      setStatus(`Vault loaded successfully. Threshold: ${vaultDetails.threshold}/${vaultDetails.members.length}`);
      
    } catch (error) {
      console.error('Error loading vault info:', error);
      setStatus(`Error loading vault: ${error.message}`);
    }
  };

  const transferTokens = async () => {
    if (!squads || !recipientAddress || !transferAmount) {
      setStatus('Please fill in all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Preparing token transfer...');

      const recipientPubkey = new PublicKey(recipientAddress);
      const amount = parseFloat(transferAmount) * LAMPORTS_PER_SOL; // Convert SOL to lamports

      if (!vaultAddress) {
        throw new Error('Vault address not configured');
      }

      const vaultPubkey = new PublicKey(vaultAddress);

      // Create a transaction to transfer SOL from the vault
      const transaction = await squads.createTransaction(vaultPubkey);
      
      // Add transfer instruction
      const transferInstruction = {
        programId: new PublicKey('11111111111111111111111111111111'), // System Program
        keys: [
          { pubkey: vaultPubkey, isSigner: false, isWritable: true },
          { pubkey: recipientPubkey, isSigner: false, isWritable: true }
        ],
        data: Buffer.alloc(4 + 8) // Transfer instruction + amount
      };

      // Set up the transfer instruction data
      const data = Buffer.alloc(4 + 8);
      data.writeUInt32LE(2, 0); // Transfer instruction
      data.writeBigUInt64LE(BigInt(amount), 4); // Amount in lamports

      transferInstruction.data = data;

      await transaction.addInstruction(transferInstruction);

      setStatus('Transaction created. Please review and sign...');

      // For now, we'll just show the transaction details
      // In a real implementation, you would need to handle the multisig approval process
      setStatus(`Transaction prepared for ${transferAmount} SOL to ${recipientAddress}. This requires multisig approval.`);

    } catch (error) {
      console.error('Error creating transfer:', error);
      setStatus(`Error creating transfer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openSolscan = () => {
    if (vaultAddress) {
      window.open(`https://solscan.io/account/${vaultAddress}`, '_blank');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">Squads Connect</h1>
        <p className="subtitle">
          Connect to your Squads vault and transfer tokens securely
        </p>

        {!isConnected ? (
          <button 
            className="button" 
            onClick={connectWallet}
            disabled={isLoading || !wallet}
          >
            {isLoading ? <span className="loading"></span> : ''}
            Connect Phantom Wallet
          </button>
        ) : (
          <div>
            <div className="vault-info">
              <h3>Vault Information</h3>
              {vaultInfo ? (
                <>
                  <p><strong>Address:</strong> {vaultInfo.address}</p>
                  <p><strong>Threshold:</strong> {vaultInfo.threshold}/{vaultInfo.members.length}</p>
                  <p><strong>Members:</strong> {vaultInfo.members.length}</p>
                </>
              ) : (
                <p>Loading vault information...</p>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="recipient">Recipient Wallet Address:</label>
              <input
                id="recipient"
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter recipient wallet address"
              />
            </div>

            <div className="input-group">
              <label htmlFor="amount">Amount (SOL):</label>
              <input
                id="amount"
                type="number"
                step="0.000000001"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="Enter amount in SOL"
              />
            </div>

            <button 
              className="button" 
              onClick={transferTokens}
              disabled={isLoading || !recipientAddress || !transferAmount}
            >
              {isLoading ? <span className="loading"></span> : ''}
              Transfer Tokens
            </button>

            <button 
              className="button" 
              onClick={openSolscan}
              style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)' }}
            >
              View on Solscan
            </button>
          </div>
        )}

        {status && (
          <div className={`status ${status.includes('Error') ? 'error' : status.includes('Connected') || status.includes('successfully') ? 'success' : 'info'}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
