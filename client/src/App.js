import Upload from "./artifacts/contracts/Upload.sol/Upload.json";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import { getContractAddress } from "./config";
import "./App.css";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);

  // Function to handle account updates
  const updateAccount = async (provider) => {
    if (provider) {
      const signer = provider.getSigner();
      try {
        const address = await signer.getAddress();
        setAccount(address);
        
        // Get network to determine contract address
        const network = await provider.getNetwork();
        const chainId = network.chainId.toString();
        
        // Get the deployed contract address from the config
        let contractAddress = getContractAddress(chainId);
        
        // IMPORTANT: Update this line with your actual contract address
        // This is likely the reason your files aren't showing up
        contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Replace with your actual contract address
        
        // Verify contractAddress is a proper address and not an ENS name
        if (!ethers.utils.isAddress(contractAddress)) {
          console.error("Invalid contract address:", contractAddress);
          alert("Contract address is invalid. Please check your configuration.");
          return;
        }
        
        try {
          const contract = new ethers.Contract(
            contractAddress,
            Upload.abi,
            signer
          );
          
          setContract(contract);
          console.log("Contract connected at:", contractAddress);
          console.log("Account updated:", address);
        } catch (contractError) {
          console.error("Error connecting to contract:", contractError);
          alert("Error connecting to the smart contract. Please check the contract address and ABI.");
        }
      } catch (error) {
        console.error("Error updating account:", error);
        setAccount("");
        setContract(null);
      }
    }
  };

  useEffect(() => {
    const loadProvider = async () => {
      if (!window.ethereum) {
        console.error("Metamask is not installed");
        alert("Please install MetaMask to use this application");
        return;
      }
      
      try {
        // Initialize provider with specific configuration
        const provider = new ethers.providers.Web3Provider(window.ethereum, {
          name: "localhost",
          chainId: window.ethereum.chainId ? parseInt(window.ethereum.chainId, 16) : 1337,
          ensAddress: null // Explicitly disable ENS
        });
        
        setProvider(provider);
        
        // Handle chain changes with reload (network changes typically need reload)
        window.ethereum.on("chainChanged", () => {
          window.location.reload();
        });

        // Handle account changes without reload
        window.ethereum.on("accountsChanged", async (accounts) => {
          console.log("Account changed:", accounts[0]);
          if (accounts.length > 0) {
            // Update account without page reload
            await updateAccount(provider);
          } else {
            // If user disconnected all accounts
            setAccount("");
            setContract(null);
          }
        });
        
        // Initial account setup
        try {
          await provider.send("eth_requestAccounts", []);
          await updateAccount(provider);
        } catch (connectionError) {
          console.error("Error connecting wallet:", connectionError);
          alert("Failed to connect to your wallet. Please try again.");
        }
      } catch (error) {
        console.error("Error initializing provider:", error);
        alert("Failed to initialize blockchain connection. Please refresh the page.");
      }
    };
    
    loadProvider();
    
    // Clean up event listeners when component unmounts
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("chainChanged", () => {});
        window.ethereum.removeListener("accountsChanged", () => {});
      }
    };
  }, []);

  // Add logout function
  const logout = async () => {
    setAccount("");
    setContract(null);
    console.log("Logged out from the application");
  };
  
  // Add connect function
  const connect = async () => {
    try {
      if (provider) {
        await provider.send("eth_requestAccounts", []);
        await updateAccount(provider);
      }
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  // Add a file upload success handler
  const handleUploadSuccess = () => {
    // Force a refresh of the Display component
    setForceRefresh(prev => prev + 1);
  };

  // Function to handle opening share modal
  const openShareModal = () => {
    if (!contract) {
      alert("Please wait for contract connection to complete");
      return;
    }
    setModalOpen(true);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SafeChain</h1>
        <p className="account-info">
          Account: {account ? account : "Not connected"}
        </p>
        <div className="header-buttons">
          {!modalOpen && account && (
            <button className="app-button" onClick={openShareModal}>
              Share
            </button>
          )}
          {account ? (
            <button className="app-button" onClick={logout}>
              Logout
            </button>
          ) : (
            <button className="app-button" onClick={connect}>
              Connect
            </button>
          )}
        </div>
      </header>

      {modalOpen && (
        <Modal 
          setModalOpen={setModalOpen} 
          contract={contract}
          account={account}
        />
      )}

      <div className="App">
        <div className="content-container">
          <div className="content-row">
            <div className="content-left">
              <h2>Secure File Sharing</h2>
              <p>
              Easily and securely share, store, and manage your files with blockchain technology, ensuring privacy, integrity, and decentralized control.
              </p>
            </div>
            <div className="content-right">
              <FileUpload
                account={account}
                provider={provider}
                contract={contract}
                onUploadSuccess={handleUploadSuccess}
              />
            </div>
          </div>
          
          {/* Single Display component with enhanced IPFS functionality */}
          <div className="files-section">
            <h2>My Files</h2>
            <Display 
              contract={contract} 
              account={account}
              enableDownload={true}
              enablePreview={true}
              key={`files-${forceRefresh}`} // Force re-render when files are uploaded
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
