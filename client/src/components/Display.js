import { useState, useEffect, useCallback } from "react";
import { formatIpfsUrl } from "../config";
import "./Display.css";

const Display = ({ contract, account, enableDownload = false, enablePreview = false }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create a fetchFiles function that can be called from both useEffect and button click
  const fetchFiles = useCallback(async () => {
    if (contract && account) {
      try {
        console.log("Fetching files for account:", account);
        setLoading(true);
        setError("");
        
        // Try to call the display function with different signatures
        let fileUrls = [];
        
        // Debug the contract methods
        console.log("Available contract methods:", 
          Object.keys(contract.functions || {})
            .filter(fn => !fn.includes('('))
            .join(', ')
        );
        
        try {
          // Try with account parameter
          console.log("Attempting to call contract.display with account");
          fileUrls = await contract.display(account);
          console.log("Files retrieved:", fileUrls);
        } catch (contractError) {
          console.error("Error calling display function with account:", contractError);
          
          try {
            // Try without parameters
            console.log("Attempting to call contract.display without params");
            fileUrls = await contract.display();
            console.log("Files retrieved:", fileUrls);
          } catch (noParamError) {
            console.error("Error calling display function without params:", noParamError);
            
            // Try alternative method names
            const attempts = [
              { name: 'getFiles', args: [account] },
              { name: 'getAllFiles', args: [] },
              { name: 'viewFiles', args: [] },
              { name: 'getImages', args: [account] },
              { name: 'getImagesOf', args: [account] },
              { name: 'getUploads', args: [account] }
            ];
            
            let succeeded = false;
            
            for (const attempt of attempts) {
              if (typeof contract[attempt.name] === 'function') {
                try {
                  console.log(`Attempting to call contract.${attempt.name}`);
                  fileUrls = await contract[attempt.name](...attempt.args);
                  console.log("Files retrieved:", fileUrls);
                  succeeded = true;
                  break;
                } catch (err) {
                  console.warn(`Error calling ${attempt.name}:`, err);
                }
              }
            }
            
            if (!succeeded) {
              throw new Error("Could not find a compatible method to retrieve files");
            }
          }
        }
        
        if (fileUrls && fileUrls.length > 0) {
          console.log("Processing retrieved files...");
          // Process the files data and fetch metadata from IPFS
          const processedFiles = await Promise.all(
            fileUrls.map(async (url, index) => {
              try {
                // Some contracts return objects instead of strings
                const actualUrl = typeof url === 'object' && url.url ? url.url : url;
                
                // Format the IPFS URL properly using the config utility
                const ipfsUrl = formatIpfsUrl(actualUrl);
                console.log(`Formatted URL ${index}:`, actualUrl, "→", ipfsUrl);
                
                // Basic validation - skip empty URLs
                if (!ipfsUrl) {
                  console.warn(`Skipping empty URL at index ${index}`);
                  return null;
                }
                
                // Fetch metadata if available
                let metadata = null;
                try {
                  const metadataResponse = await fetch(`${ipfsUrl}.metadata.json`, { method: 'HEAD' });
                  if (metadataResponse.ok) {
                    const fullMetadataResponse = await fetch(`${ipfsUrl}.metadata.json`);
                    metadata = await fullMetadataResponse.json();
                  }
                } catch (error) {
                  console.warn("Metadata not available for file:", ipfsUrl);
                }
                
                const fileType = guessFileType(actualUrl);
                
                return {
                  url: ipfsUrl,
                  originalUrl: actualUrl,
                  name: metadata?.name || `File ${index + 1}`,
                  type: metadata?.type || fileType,
                  size: metadata?.size || "Unknown",
                  uploadDate: metadata?.uploadDate || "Unknown"
                };
              } catch (error) {
                console.error("Error processing file:", error);
                return null;
              }
            })
          );
          
          // Filter out any failed processes
          const validFiles = processedFiles.filter(file => file !== null);
          console.log("Valid processed files:", validFiles.length);
          setFiles(validFiles);
        } else {
          console.log("No files found for account");
          setFiles([]);
        }
      } catch (error) {
        console.error("Error fetching files:", error);
        setError(`Failed to load files: ${error.message}`);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    } else {
      if (!contract) console.log("Contract not initialized yet");
      if (!account) console.log("Account not initialized yet");
    }
  }, [contract, account]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);
  
  // Keep the local formatIpfsUrl as fallback
  const formatIpfsUrlFallback = (url) => {
    if (!url) return "";
    
    // Check if URL is already using a gateway
    if (url.startsWith("https://") || url.startsWith("http://")) {
      return url;
    }
    
    // Handle ipfs:// protocol
    if (url.startsWith("ipfs://")) {
      const cid = url.replace("ipfs://", "");
      return `https://ipfs.io/ipfs/${cid}`;
    }
    
    // Handle direct CID or /ipfs/ path
    if (url.startsWith("Qm") || url.startsWith("/ipfs/")) {
      const cid = url.startsWith("/ipfs/") ? url.replace("/ipfs/", "") : url;
      return `https://ipfs.io/ipfs/${cid}`;
    }
    
    return url;
  };
  
  // Guess the file type based on URL or extension
  const guessFileType = (url) => {
    if (!url) return "unknown";
    
    const extension = url.split('.').pop().toLowerCase();
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return "image";
    }
    
    // Document types
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return "document";
    }
    
    // Audio types
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return "audio";
    }
    
    // Video types
    if (['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
      return "video";
    }
    
    return "unknown";
  };
  
  // Download file function
  const downloadFile = async (file) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up
      setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 100);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file. Please try again.");
    }
  };
  
  // Render file preview based on type
  const renderPreview = (file) => {
    if (!enablePreview) return null;
    
    switch (file.type) {
      case "image":
        return <img src={file.url} alt={file.name} className="file-preview" />;
      
      case "video":
        return (
          <video controls className="file-preview">
            <source src={file.url} type="video/mp4" />
            Your browser does not support video playback.
          </video>
        );
      
      case "audio":
        return (
          <audio controls className="file-preview">
            <source src={file.url} />
            Your browser does not support audio playback.
          </audio>
        );
      
      case "document":
        if (file.url.endsWith(".pdf")) {
          return (
            <iframe 
              src={file.url} 
              title={file.name}
              className="file-preview pdf-preview"
            />
          );
        }
        return <div className="document-icon">📄</div>;
      
      default:
        return <div className="file-icon">📁</div>;
    }
  };

  return (
    <div className="display-files-container">
      {loading ? (
        <div className="loading-indicator">Loading your files...</div>
      ) : error ? (
        <div className="error-message-display">{error}</div>
      ) : files.length > 0 ? (
        <div className="files-grid">
          {files.map((file, index) => (
            <div key={index} className="file-card">
              <div className="file-preview-container">
                {renderPreview(file)}
              </div>
              <div className="file-info">
                <h3 className="file-name">{file.name}</h3>
                <p className="file-type">{file.type}</p>
                <p className="file-size">{file.size}</p>
                <p className="file-url" title={file.originalUrl}>
                  {file.originalUrl && file.originalUrl.substring(0, 20)}...
                </p>
              </div>
              {enableDownload && (
                <button 
                  className="download-button"
                  onClick={() => downloadFile(file)}
                >
                  Download
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-files-message">
          <p>No files found. Upload some files to see them here.</p>
          <button 
            className="refresh-button"
            onClick={fetchFiles}
          >
            Refresh Files
          </button>
        </div>
      )}
    </div>
  );
};

export default Display;
