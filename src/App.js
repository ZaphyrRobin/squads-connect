import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, Transaction } from '@solana/web3.js';
import * as multisig from '@sqds/multisig';
import './App.css';

const SQUADS_PROGRAM_ID = "SQDS4ep65T869zMMBKyuUq6aD6EgTu8psMjkvj52pCf";

function App() {
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [vaultInfo, setVaultInfo] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [multisigPda, setMultisigPda] = useState(null);
  const [vaultPda, setVaultPda] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');

  // Environment variables
  const multisigAccount = process.env.REACT_APP_MULTISIG_ACCOUNT;
  const defaultRecipient = process.env.REACT_APP_RECIPIENT_WALLET;
  const rpcUrl = process.env.REACT_APP_RPC_URL;

  useEffect(() => {
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
      const address = response.publicKey.toString();
      
      setIsConnected(true);
      setWalletAddress(address);
      setStatus(`Connected to wallet: ${address}`);
      
      await loadVaultInfo();
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setStatus(`Error connecting wallet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVaultInfo = async () => {
    try {
      if (!multisigAccount) {
        setStatus('Multisig account not configured in environment variables.');
        return;
      }

      setStatus('Loading vault information...');

      const connection = new Connection(rpcUrl, 'confirmed');
      const multisigPdaPubkey = new PublicKey(multisigAccount);
      setMultisigPda(multisigAccount);
      
      const [vaultPdaPubkey] = multisig.getVaultPda({ multisigPda: multisigPdaPubkey, index: 0 });
      setVaultPda(vaultPdaPubkey.toString());
      
      const accountInfo = await connection.getAccountInfo(multisigPdaPubkey);
      if (!accountInfo) {
        throw new Error('Multisig account not found. Please check the vault address.');
      }

      if (accountInfo.owner.toString() !== SQUADS_PROGRAM_ID) {
        throw new Error(`This is not a Squads multisig account. Owner: ${accountInfo.owner.toString()}, Expected: ${SQUADS_PROGRAM_ID}`);
      }

      const multisigAccountData = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPdaPubkey);
      
      setVaultInfo({
        multisigAddress: multisigAccount,
        vaultAddress: vaultPdaPubkey.toString(),
        threshold: multisigAccountData.threshold,
        members: multisigAccountData.members,
        version: multisigAccountData.version
      });

      setStatus(`Vault loaded successfully. Threshold: ${multisigAccountData.threshold}/${multisigAccountData.members.length}`);
      
    } catch (error) {
      console.error('Error loading vault info:', error);
      
      if (error.message.includes('403') || error.message.includes('Access forbidden')) {
        setStatus('RPC endpoint access denied. Please try a different RPC endpoint in your .env file.');
      } else if (error.message.includes('fetch')) {
        setStatus('Network error. Please check your internet connection and RPC endpoint.');
      } else if (error.message.includes('COption') || error.message.includes('Expected to hold')) {
        setStatus('Account structure error. This might not be a valid Squads multisig account or the SDK version is incompatible.');
      } else if (error.message.includes('not a Squads multisig account')) {
        setStatus('❌ This address is not a valid Squads multisig account. Please check the Squads app to get the correct multisig address.');
      } else {
        setStatus(`Error loading vault: ${error.message}`);
      }
    }
  };

  const transferTokens = async () => {
    if (!multisigPda || !vaultPda || !recipientAddress || !transferAmount) {
      setStatus('Please fill in all required fields and ensure vault is loaded.');
      return;
    }

    try {
      setIsLoading(true);
      setStatus('Preparing token transfer...');

      const connection = new Connection(rpcUrl, 'confirmed');
      const walletPublicKey = new PublicKey(wallet.publicKey);
      const recipientPubkey = new PublicKey(recipientAddress);
      const vaultPdaPubkey = new PublicKey(vaultPda);
      const multisigPdaPubkey = new PublicKey(multisigPda);

      const amount = parseFloat(transferAmount) * LAMPORTS_PER_SOL;

      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid transfer amount');
      }

      const transferInstruction = SystemProgram.transfer({
        fromPubkey: vaultPdaPubkey,
        toPubkey: recipientPubkey,
        lamports: amount,
      });

      const { blockhash } = await connection.getLatestBlockhash();

      const transactionMessage = new TransactionMessage({
        payerKey: walletPublicKey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
      });

      const multisigAccountData = await multisig.accounts.Multisig.fromAccountAddress(connection, multisigPdaPubkey);
      const currentTransactionIndex = Number(multisigAccountData.transactionIndex);
      const transactionIndex = BigInt(currentTransactionIndex + 1);

      setStatus('Creating vault transaction...');

      try {
        const vaultTransactionInstruction = await multisig.instructions.vaultTransactionCreate({
          multisigPda: multisigPdaPubkey,
          transactionIndex,
          creator: walletPublicKey,
          vaultIndex: 0,
          ephemeralSigners: 0,
          transactionMessage,
        });

        const proposalInstruction = await multisig.instructions.proposalCreate({
          multisigPda: multisigPdaPubkey,
          transactionIndex,
          creator: walletPublicKey,
        });

        const combinedTransaction = new Transaction();
        combinedTransaction.add(vaultTransactionInstruction);
        combinedTransaction.add(proposalInstruction);
        combinedTransaction.recentBlockhash = blockhash;
        combinedTransaction.feePayer = walletPublicKey;

        const signature = await wallet.signAndSendTransaction(combinedTransaction);

        setStatus(
          `✅ Transaction proposal created successfully! 
          Transaction Index: ${transactionIndex.toString()}
          Transaction Signature: ${signature}
          Transfer Details:
          • From: ${vaultPdaPubkey.toString()}
          • To: ${recipientPubkey.toString()}
          • Amount: ${transferAmount} SOL (${amount} lamports)`
        );
      } catch (createError) {
        console.error('Error creating transaction or proposal:', createError);
        setStatus(`❌ Failed to create transaction proposal automatically. Error: ${createError.message}`);
      }

    } catch (error) {
      console.error('Error creating transfer:', error);
      setStatus(`Error creating transfer: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openSolscan = () => {
    window.open(`https://solscan.io/account/${multisigAccount}`, '_blank');
  };


  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <h1 className="nav-title">Squads Connect</h1>
        </div>
        <div className="nav-wallet">
          {isConnected && walletAddress ? (
            <div className="wallet-info">
              <span className="wallet-label">Connected:</span>
              <span className="wallet-address">
                {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
              </span>
              <button 
                className="wallet-disconnect"
                onClick={() => {
                  setIsConnected(false);
                  setWalletAddress('');
                  setVaultInfo(null);
                  setStatus('');
                }}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="wallet-info">
              <span className="wallet-label">Not Connected</span>
            </div>
          )}
        </div>
      </nav>

      <div className="container">
        <div className="card">
          <h1 className="title">Squads Connect</h1>

        {!isConnected ? (
          <button 
            className="button connect-button" 
            onClick={connectWallet}
            disabled={isLoading || !wallet}
          >
            {isLoading ? <span className="loading"></span> : ''}
            Connect Phantom
          </button>
        ) : (
          <div>
            <div className="vault-info">
              <h3>Vault Information</h3>
              {vaultInfo ? (
                <>
                  <p><strong>Multisig Address:</strong> {vaultInfo.multisigAddress}</p>
                  <p><strong>Vault Address:</strong> {vaultInfo.vaultAddress}</p>
                  <p><strong>Threshold:</strong> {vaultInfo.threshold}/{vaultInfo.members.length}</p>
                  <p><strong>Members:</strong> {vaultInfo.members.length}</p>
                </>
              ) : (
                <div>
                  <p>Loading vault information...</p>
                  <div className="help-section">
                    <h4>🔍 Need Help Finding Your Squads Address?</h4>
                    <p>If you're getting an error, make sure you're using the correct address type.</p>
                    <ol>
                      <li>Go to <a href="https://app.squads.so" target="_blank" rel="noopener noreferrer">app.squads.so</a></li>
                      <li>Connect your wallet and go to your squad settings</li>
                      <li>Copy the <strong>Multisig Account</strong> address (not the Squad Vault address)</li>
                      <li>Update your <code>.env</code> file with the multisig address</li>
                    </ol>
                    <div className="address-types">
                      <p><strong>✅ Use this:</strong> Multisig Account address (e.g., BerUwitRYtiSxFnEHUEcuoRAmukC7BKS5fniVF2XPc7T)</p>
                      <p><strong>❌ Don't use:</strong> Squad Vault address (e.g., 2jkmX7rorYkrqZeFwHjp14LCYM7vmpgdg79LrxQBmdEV)</p>
                      <p><strong>💡 Note:</strong> The vault address is automatically derived from the multisig account.</p>
                    </div>
                  </div>
                </div>
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

            <div className="button-group">
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
          </div>
        )}

          {status && (
            <div className={`status ${status.includes('Error') ? 'error' : status.includes('Connected') || status.includes('successfully') ? 'success' : 'info'}`}>
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
