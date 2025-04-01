import Upload from "./artifacts/contracts/Upload.sol/Upload.json";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import "./App.css";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Function to handle account updates
  const updateAccount = async (provider) => {
    if (provider) {
      const signer = provider.getSigner();
      try {
        const address = await signer.getAddress();
        setAccount(address);
        
        let contractAddress = "Your Contract Address Here";
        const contract = new ethers.Contract(
          contractAddress,
          Upload.abi,
          signer
        );
        
        setContract(contract);
        console.log("Account updated:", address);
      } catch (error) {
        console.error("Error updating account:", error);
        setAccount("");
        setContract(null);
      }
    }
  };

  useEffect(() => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(provider);

    const loadProvider = async () => {
      if (provider) {
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
        await provider.send("eth_requestAccounts", []);
        await updateAccount(provider);
      } else {
        console.error("Metamask is not installed");
      }
    };
    
    provider && loadProvider();
    
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

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SafeChain</h1>
        <p className="account-info">
          Account: {account ? account : "Not connected"}
        </p>
        <div className="header-buttons">
          {!modalOpen && account && (
            <button className="app-button" onClick={() => setModalOpen(true)}>
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
        <Modal setModalOpen={setModalOpen} contract={contract}></Modal>
      )}

      <div className="App">
        <div className="bg"></div>
        <div className="bg bg2"></div>
        <div className="bg bg3"></div>

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
              ></FileUpload>
            </div>
          </div>
          <Display contract={contract} account={account}></Display>
        </div>
      </div>
    </div>
  );
}

export default App;
