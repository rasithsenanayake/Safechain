// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

contract Upload {
  
  struct Access{
     address user; 
     bool access; //true or false
  }
  mapping(address=>string[]) value;
  mapping(address=>mapping(address=>bool)) ownership;
  mapping(address=>Access[]) accessList;
  mapping(address=>mapping(address=>bool)) previousData;
  
  // Events for state changes
  event FileAdded(address indexed user, string url);
  event AccessAllowed(address indexed owner, address indexed user);
  event AccessRevoked(address indexed owner, address indexed user);

  /**
   * @notice Add a new file URL to the user's storage
   * @param url The URL of the file to add
   */
  function add(string memory url) external {
      value[msg.sender].push(url);
      emit FileAdded(msg.sender, url);
  }
  
  /**
   * @notice Allow another user to access your files
   * @param user Address of user to grant access
   */
  function allow(address user) external {
      require(user != address(0), "Invalid user address");
      ownership[msg.sender][user] = true; 
      
      if(previousData[msg.sender][user]){
         for(uint i=0; i<accessList[msg.sender].length; i++){
             if(accessList[msg.sender][i].user == user){
                  accessList[msg.sender][i].access = true; 
             }
         }
      } else {
          accessList[msg.sender].push(Access(user, true));  
          previousData[msg.sender][user] = true;  
      }
      
      emit AccessAllowed(msg.sender, user);
  }
  
  /**
   * @notice Revoke a user's access to your files
   * @param user Address of user to revoke access
   */
  function disallow(address user) external {
      require(user != address(0), "Invalid user address");
      ownership[msg.sender][user] = false;
      
      for(uint i=0; i<accessList[msg.sender].length; i++){
          if(accessList[msg.sender][i].user == user){ 
              accessList[msg.sender][i].access = false;  
          }
      }
      
      emit AccessRevoked(msg.sender, user);
  }

  /**
   * @notice View files stored by a specific user
   * @param _user Address of the user whose files to view
   * @return Array of file URLs
   */
  function display(address _user) external view returns(string[] memory){
      require(_user == msg.sender || ownership[_user][msg.sender], "You don't have access");
      return value[_user];
  }

  /**
   * @notice Get list of all users who have been granted access by the caller
   * @return Array of Access structures
   */
  function getSharedAccessList() external view returns(Access[] memory){
      return accessList[msg.sender];
  }
}