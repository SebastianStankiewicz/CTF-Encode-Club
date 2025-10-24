"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";

export default function WalletTest() {
  const { connected, connecting, publicKey, wallet, wallets, select, connect } = useWallet();
  const [phantomInstalled, setPhantomInstalled] = useState(false);

  useEffect(() => {
    // Check if Phantom is installed
    const isPhantomInstalled = !!(window as any).phantom?.solana?.isPhantom;
    setPhantomInstalled(isPhantomInstalled);
    
    console.log("=== WALLET TEST ===");
    console.log("Phantom installed:", isPhantomInstalled);
    console.log("Connected:", connected);
    console.log("Connecting:", connecting);
    console.log("PublicKey:", publicKey?.toBase58());
    console.log("Wallet:", wallet?.adapter?.name);
    console.log("Available wallets:", wallets.map(w => w.adapter.name));
    console.log("===================");
  }, [connected, connecting, publicKey, wallet, wallets]);

  const handleManualConnect = async () => {
    try {
      const phantomWallet = wallets.find(w => w.adapter.name === 'Phantom');
      if (phantomWallet) {
        select(phantomWallet.adapter.name);
        await connect();
      } else {
        alert('Phantom wallet not found');
      }
    } catch (error) {
      console.error('Manual connection failed:', error);
    }
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <h3 className="text-lg font-bold mb-4">Wallet Connection Test</h3>
      
      {/* Phantom Installation Check */}
      <div className="mb-4 p-3 rounded-lg bg-blue-50">
        <h4 className="font-semibold text-blue-800 mb-2">Wallet Detection:</h4>
        <div className="text-sm">
          <div>Phantom: {phantomInstalled ? "✅ Installed" : "❌ Not detected"}</div>
          <div>Available: {wallets.length} wallet adapters</div>
        </div>
        {!phantomInstalled && (
          <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-xs">
            ⚠️ Phantom wallet not detected. Please install the Phantom browser extension and refresh the page.
            <br />
            <a 
              href="https://phantom.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-yellow-900"
            >
              Download Phantom Wallet
            </a>
          </div>
        )}
      </div>
      
      <div className="mb-4 space-y-2">
        <WalletMultiButton />
        {phantomInstalled && !connected && (
          <button
            onClick={handleManualConnect}
            className="block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
          >
            🔧 Try Manual Phantom Connection
          </button>
        )}
      </div>
      
      <div className="space-y-2 text-sm font-mono">
        <div>Connected: {connected ? "✅ Yes" : "❌ No"}</div>
        <div>Connecting: {connecting ? "🔄 Yes" : "❌ No"}</div>
        <div>Wallet: {wallet?.adapter?.name || "None"}</div>
        <div>PublicKey: {publicKey?.toBase58() || "None"}</div>
      </div>
      
      {connected && publicKey && (
        <div className="mt-4 p-2 bg-green-100 rounded">
          <p className="text-green-800">
            ✅ Wallet successfully connected!
          </p>
          <p className="text-xs text-green-600">
            {publicKey.toBase58()}
          </p>
        </div>
      )}
      
      {connecting && (
        <div className="mt-4 p-2 bg-yellow-100 rounded">
          <p className="text-yellow-800">
            🔄 Connecting to wallet...
          </p>
        </div>
      )}
    </div>
  );
}