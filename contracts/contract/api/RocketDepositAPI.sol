pragma solidity 0.4.24;


import "../../RocketBase.sol";
import "../../interface/api/RocketGroupAPIInterface.sol";
import "../../interface/deposit/RocketDepositInterface.sol";
import "../../interface/group/RocketGroupContractInterface.sol";
import "../../interface/settings/RocketDepositSettingsInterface.sol";
import "../../interface/settings/RocketMinipoolSettingsInterface.sol";


/// @title RocketDepositAPI - API for deposits into the Rocket Pool network
/// @author David Rugendyke

contract RocketDepositAPI is RocketBase {


    /*** Contracts **************/

    RocketGroupAPIInterface rocketGroupAPI = RocketGroupAPIInterface(0);                                            // The group contract for the API
    RocketDepositInterface rocketDeposit = RocketDepositInterface(0);                                               // Rocket Pool deposits contract
    RocketDepositSettingsInterface rocketDepositSettings = RocketDepositSettingsInterface(0);                       // The main settings contract for the API
    RocketMinipoolSettingsInterface rocketMinipoolSettings = RocketMinipoolSettingsInterface(0);                    // The main settings contract for minipools


    /*** Modifiers *************/

    /// @dev Only passes if the supplied minipool duration is valid
    /// @param _durationID The ID that determines the minipool duration
    modifier onlyValidDuration(string _durationID) {
        // Check to verify the supplied mini pool staking time id is legit, it will revert if not
        rocketMinipoolSettings = RocketMinipoolSettingsInterface(getContractAddress("rocketMinipoolSettings"));
        rocketMinipoolSettings.getMinipoolStakingDuration(_durationID);
        _;
    }

  
    /*** Events ****************/

    event Deposit (
        address indexed _from,                                              // Address that sent the deposit, must be registered to the GroupID
        address indexed _userID,                                            // Address of the users account that owns the deposit
        address indexed _groupID,                                           // Group ID that controls the deposit
        string  durationID,                                                 // The deposits staking duration ID
        uint256 value,                                                      // Amount in wei deposited
        uint256 created                                                     // Timestamp of the deposit
    );



    /*** Constructor *************/
   
    /// @dev constructor
    constructor(address _rocketStorageAddress) RocketBase(_rocketStorageAddress) public {
        // Version
        version = 1;
    }



    /*** Getters *************/

    /// @dev Checks if the deposit parameters are correct for a successful deposit
    /// @param _value The amount being deposited
    /// @param _from  The address sending the deposit
    /// @param _groupID The generated conract address for the group / 3rd party partner whom is in control of the supplid user account that the deposit belongs too
    /// @param _userID The address of the user whom the deposit belongs too
    /// @param _durationID The ID that determines which pool the user intends to join based on the staking blocks of that pool (3 months, 6 months etc)
    function getDepositIsValid(uint256 _value, address _from, address _groupID, address _userID, string _durationID) public onlyValidDuration(_durationID) returns(bool) { 
        // Get contracts
        rocketDepositSettings = RocketDepositSettingsInterface(getContractAddress("rocketDepositSettings"));
        rocketGroupAPI = RocketGroupAPIInterface(getContractAddress("rocketGroupAPI"));
        // Deposits turned on?
        require(rocketDepositSettings.getDepositAllowed(), "Deposits are currently disabled.");
        // Is the deposit value acceptable?
        require(_value >= rocketDepositSettings.getDepositMin(), "Deposit value is less than the minimum allowed.");
        require(_value <= rocketDepositSettings.getDepositMax(), "Deposit value is more than the maximum allowed.");
        // Check addresses are correct
        require(address(_from) != address(0x0), "From address is not a correct address");
        require(address(_userID) != address(0x0), "UserID address is not a correct address");
        // Verify the groupID exists
        require(bytes(rocketGroupAPI.getGroupName(_groupID)).length > 0, "Group ID specified does not match a group name or does not exist");
        // Verify that _from is a depositor of the group
        RocketGroupContractInterface rocketGroup = RocketGroupContractInterface(_groupID);
        require(rocketGroup.hasDepositor(_from), "Group ID specified does not have a depositor matching the sender.");
        // All good
        return true;
    }

    
    /*** Methods *************/

   
    /// @notice Send `msg.value ether` Eth from the account of `message.caller.address()`, to an account accessible only by Rocket Pool at `to.address()`.
    /// @dev Deposit to Rocket Pool, can be from a user or a partner on behalf of their user
    /// @param _groupID The ID of the group / 3rd party partner contract whom is in control of the supplid user account that the deposit belongs too
    /// @param _userID The address of the user whom the deposit belongs too
    /// @param _durationID The ID that determines which pool the user intends to join based on the staking blocks of that pool (3 months, 6 months etc)
    function deposit(address _groupID, address _userID, string _durationID) public payable onlyLatestContract("rocketDepositAPI", address(this)) onlyValidDuration(_durationID) returns(bool) { 
        // Verify the deposit is acceptable
        if(getDepositIsValid(msg.value, msg.sender, _groupID, _userID, _durationID)) {  
            // Send and create deposit
            rocketDeposit = RocketDepositInterface(getContractAddress("rocketDeposit"));
            require(rocketDeposit.create.value(msg.value)(_userID, _groupID, _durationID), "Deposit could not be created");
            // All good? Fire the event for the new deposit
            emit Deposit(msg.sender, _userID, _groupID, _durationID, msg.value, now);   
            // Done
            return true;
        }
        // Safety
        return false;    
    }


}
