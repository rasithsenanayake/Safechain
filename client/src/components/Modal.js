import { useState, useEffect } from "react";
import "./Modal.css";

const Modal = ({ setModalOpen, contract, account }) => {
  const [errorMsg, setErrorMsg] = useState("");
  const [accessList, setAccessList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sharing = async () => {
    const addressInput = document.querySelector(".modal-input");
    const address = addressInput?.value;
    
    if (!address) {
      setErrorMsg("Please enter a valid address");
      return;
    }

    if (!contract) {
      setErrorMsg("Contract not connected");
      return;
    }

    try {
      setIsLoading(true);
      // Check if the contract has an 'allow' method
      if (typeof contract.allow === 'function') {
        await contract.allow(address);
        setModalOpen(false);
      } else if (typeof contract.giveAccess === 'function') {
        // Try alternative method name if 'allow' is not available
        await contract.giveAccess(address);
        setModalOpen(false);
      } else {
        setErrorMsg("This contract doesn't support sharing functionality");
      }
    } catch (error) {
      console.error("Error sharing access:", error);
      setErrorMsg(error.message || "Failed to share access");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchAccessList = async () => {
      if (!contract) return;
      
      try {
        setIsLoading(true);
        
        // Try different possible method names for getting the access list
        let addresses = [];
        
        try {
          if (typeof contract.shareAccess === 'function') {
            addresses = await contract.shareAccess();
          } else if (typeof contract.getSharedAddresses === 'function') {
            addresses = await contract.getSharedAddresses();
          } else if (typeof contract.accessList === 'function') {
            addresses = await contract.accessList(account);
          } else {
            console.warn("Could not find access list method in contract");
          }
        } catch (e) {
          console.warn("Error fetching access list:", e);
        }
        
        setAccessList(Array.isArray(addresses) ? addresses : []);
      } catch (error) {
        console.error("Error loading access list:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccessList();
  }, [contract, account]);

  return (
    <div className="modal-background">
      <div className="modal-container">
        <div className="modal-title-container">
          <h2>Share with</h2>
          <button 
            className="modal-close-button" 
            onClick={() => setModalOpen(false)}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <div className="modal-form">
            <input
              type="text"
              className="modal-input"
              placeholder="Enter Ethereum Address"
            />
            
            {errorMsg && <p className="error-message">{errorMsg}</p>}
            
            {accessList.length > 0 && (
              <div className="access-list-container">
                <h3>People With Access</h3>
                <ul className="access-list">
                  {accessList.map((address, index) => (
                    <li key={index} className="access-list-item">
                      {address}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="modal-buttons">
          <button
            className="modal-button secondary"
            onClick={() => setModalOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button 
            className="modal-button primary"
            onClick={sharing}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
