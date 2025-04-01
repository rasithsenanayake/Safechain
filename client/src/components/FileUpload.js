import { useState, useRef } from "react";
import axios from "axios";
import config from "../config";
import "./FileUpload.css";

const FileUpload = ({ contract, account, provider, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  // Add progress tracking states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [uploadPhase, setUploadPhase] = useState(""); // IPFS or blockchain
  const [minimizedProgress, setMinimizedProgress] = useState(false);
  
  // Use a ref to track if a notification is already showing
  const notificationTimeoutRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !contract || isUploading) return;
    
    try {
      setIsUploading(true);
      setShowProgress(true);
      setMinimizedProgress(false);
      setUploadProgress(0);
      setUploadPhase("IPFS");
      
      // Show uploading notification
      showNotification("Uploading file to IPFS...", "info");
      
      const formData = new FormData();
      formData.append("file", file);

      // Try to get Pinata API keys from multiple sources
      const pinataApiKey = process.env.REACT_APP_PINATA_API_KEY || 
                           config.ipfs.pinata.apiKey || 
                           "dfb9f22a84581fd59e8b";
      
      const pinataApiSecret = process.env.REACT_APP_PINATA_SECRET_KEY || 
                              config.ipfs.pinata.apiSecret || 
                              "6db6a1fa8811e390c01570f310954d9784eced9dba303468d01b61805a6da060";

      console.log("Using Pinata keys:", 
        pinataApiKey ? "API Key is set" : "API Key is missing", 
        pinataApiSecret ? "API Secret is set" : "API Secret is missing"
      );

      // Upload to IPFS using Pinata
      try {
        const resFile = await axios({
          method: "post",
          url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
          data: formData,
          headers: {
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataApiSecret,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });

        const imgHash = `ipfs://${resFile.data.IpfsHash}`;
        
        // Update progress for blockchain phase
        setUploadProgress(0);
        setUploadPhase("blockchain");
        
        // Upload to blockchain
        showNotification("Saving to blockchain...", "info");
        
        try {
          // Set initial blockchain progress
          setUploadProgress(10);
          
          // Add file to blockchain - check contract function signature
          let transaction;
          
          try {
            // Try calling with just the URL (most common implementation)
            setUploadProgress(20);
            transaction = await contract.add(imgHash);
            setUploadProgress(40);
          } catch (argError) {
            console.log("Trying alternative contract method signatures...", argError);
            
            try {
              // Try with account and URL
              setUploadProgress(20);
              transaction = await contract.add(account, imgHash);
              setUploadProgress(40);
            } catch (altError) {
              console.log("Trying additional method signatures...", altError);
              setUploadProgress(20);
              
              // Try with other possible function signatures
              if (typeof contract.uploadFile === 'function') {
                transaction = await contract.uploadFile(imgHash);
              } else if (typeof contract.addFile === 'function') {
                transaction = await contract.addFile(imgHash);
              } else if (typeof contract.upload === 'function') {
                transaction = await contract.upload(imgHash);
              } else {
                throw new Error("Could not find a compatible upload method in the contract");
              }
              setUploadProgress(40);
            }
          }
          
          // Show progress for waiting for blockchain confirmation
          setUploadProgress(50);
          console.log("Transaction submitted, waiting for confirmation:", transaction.hash);
          
          // Set up a timer to increment progress while waiting for confirmation
          let confirmationProgress = 50;
          const progressInterval = setInterval(() => {
            if (confirmationProgress < 90) {
              confirmationProgress += 5;
              setUploadProgress(confirmationProgress);
            }
          }, 2000);
          
          try {
            // Wait for transaction to be mined
            const receipt = await transaction.wait();
            
            // Clear the interval and set to 100%
            clearInterval(progressInterval);
            setUploadProgress(100);
            
            console.log("Transaction confirmed:", receipt);
            
            // Clear file selection and show success notification
            setFileName("No file selected");
            setFile(null);
            
            // Show a single success notification
            showNotification("File uploaded successfully!", "success");
            
            // Reset file input
            const fileInput = document.querySelector(".input-file");
            if (fileInput) fileInput.value = "";
            
            // Trigger refresh of the display component
            if (typeof onUploadSuccess === 'function') {
              onUploadSuccess();
            }
            
            // Hide progress bar after a short delay
            setTimeout(() => {
              setShowProgress(false);
            }, 2000);
          } catch (confirmError) {
            clearInterval(progressInterval);
            console.error("Transaction failed:", confirmError);
            throw new Error("Transaction failed to confirm: " + confirmError.message);
          }
          
        } catch (e) {
          console.error("Blockchain error:", e);
          showNotification("Error saving to blockchain: " + e.message, "error");
          setShowProgress(false);
        }
      } catch (pinataError) {
        console.error("Pinata error:", pinataError);
        showNotification(
          "Failed to upload to IPFS via Pinata. " + 
          (pinataError.response?.data?.error || pinataError.message),
          "error"
        );
        setShowProgress(false);
      }
    } catch (e) {
      showNotification("Error preparing upload: " + e.message, "error");
      setShowProgress(false);
    } finally {
      setIsUploading(false);
    }
  };

  const retrieveFile = (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) {
      setFileName("No file selected");
      setFile(null);
      return;
    }
    
    const reader = new FileReader();
    reader.readAsArrayBuffer(uploadedFile);
    reader.onloadend = () => {
      setFile(uploadedFile);
    };
    setFileName(uploadedFile.name);
  };
  
  // Show notification with duration and prevent multiple popups
  const showNotification = (message, type = "info") => {
    // Clear any existing notification timeout
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    // Show new notification
    setNotification({ show: true, message, type });
    
    // Hide notification after duration
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
      notificationTimeoutRef.current = null;
    }, type === "success" ? 3000 : 5000);
  };

  const toggleMinimizeProgress = () => {
    setMinimizedProgress(!minimizedProgress);
  };

  return (
    <div className="file-upload-container">
      <form className="upload-form" onSubmit={handleSubmit}>
        <label htmlFor="file-upload" className="file-input-label">
          {fileName === "No file selected" ? (
            <span className="select-file-prompt">Select File</span>
          ) : (
            <span className="file-name">{fileName}</span>
          )}
        </label>
        <input
          disabled={!account || isUploading}
          type="file"
          id="file-upload"
          className="input-file"
          onChange={retrieveFile}
        />
        
        {/* Progress bar */}
        {showProgress && (
          <div className={`floating-progress-container ${minimizedProgress ? 'minimized' : ''}`}>
            <div className="floating-progress-header">
              <div className="floating-progress-title">
                {uploadPhase === "IPFS" ? "Uploading to IPFS" : "Saving to blockchain"}
              </div>
              <div className="floating-progress-actions">
                <button 
                  className="minimize-button" 
                  onClick={toggleMinimizeProgress}
                >
                  {minimizedProgress ? '↗' : '↘'}
                </button>
                <button 
                  className="close-progress-button"
                  onClick={() => setShowProgress(false)}
                >
                  ×
                </button>
              </div>
            </div>
            
            {!minimizedProgress && (
              <>
                <div className="floating-progress-details">
                  {uploadProgress}% Complete
                </div>
                <div className="upload-progress-bar">
                  <div 
                    className="upload-progress-fill" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </>
            )}
          </div>
        )}
        
        <button type="submit" className="upload-button" disabled={!file || !account || isUploading}>
          {isUploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      
      {/* Notification component */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <p>{notification.message}</p>
          <button 
            className="notification-close" 
            onClick={() => setNotification({ show: false, message: "", type: "" })}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
