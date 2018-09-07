pragma solidity 0.4.24;

// Interfaces
import "./../../interface/token/ERC20.sol";
import "./../../interface/RocketStorageInterface.sol";
import "./../../interface/api/RocketNodeAPIInterface.sol";
import "./../../interface/settings/RocketNodeSettingsInterface.sol";
import "./../../interface/settings/RocketMinipoolSettingsInterface.sol";
// Libraries
import "./../../lib/SafeMath.sol";


/// @title The contract for a node that operates in Rocket Pool, holds the entities ether/rpl deposits and more
/// @author David Rugendyke

contract RocketNodeContract {

    /**** Libs *****************/
    
    using SafeMath for uint;


    /**** Properties ***********/

    address private owner;                                                          // The node that created the contract
    uint8   public version;                                                         // Version of this contract

    DepositReservation private depositReservation;                                  // Node operator's deposit reservation


    /*** Contracts ***************/

    ERC20 rplContract = ERC20(0);                                                                   // The address of our RPL ERC20 token contract
    RocketStorageInterface rocketStorage = RocketStorageInterface(0);                               // The main Rocket Pool storage contract where primary persistant storage is maintained
    RocketNodeAPIInterface rocketNodeAPI = RocketNodeAPIInterface(0);                               // The main node API
    RocketNodeSettingsInterface rocketNodeSettings = RocketNodeSettingsInterface(0);                // The main node settings
    RocketMinipoolSettingsInterface rocketMinipoolSettings = RocketMinipoolSettingsInterface(0);    // The main minipool settings


    /*** Structs ***************/

    struct DepositReservation {
        string  durationID;             // The deposit duration (eg 3m, 6m etc)
        uint256 etherAmount;            // Amount of ether required
        uint256 rplAmount;              // Amount of RPL required
        uint256 rplRatio;               // Amount of RPL required per ether deposited
        uint256 created;                // The time this reservation was made
        bool exists;
    }


    /*** Events ****************/


    event NodeDepositReservation (
        address indexed _from,                                              // Address that sent the deposit
        uint256 etherAmount,                                                // Amount of ether required
        uint256 rplAmount,                                                  // Amount of RPL required
        string  durationID,                                                 // Duration of the stake
        uint256 rplRatio,                                                   // Amount of RPL required per single ether deposited
        uint256 created                                                     // The time this reservation was made
    );

    event NodeDepositReservationCancelled (
        address indexed _from,                                              // Address that sent the deposit
        uint256 reservedTime,                                               // The time the reservation was made
        uint256 created                                                     // The time this reservation was canned
    );

    
    // TODO: Remove Flag Events
    event FlagAddress (
        address flag
    );

    event FlagUint (
        uint256 flag
    );

 
    /*** Modifiers ***************/

    /// @dev Throws if called by any account other than the owner.
    modifier onlyNodeOwner() {
        require(msg.sender == owner, "Only the nodes etherbase account can perform this function.");
        _;
    }

    /// @dev Throws if the node doesn't have a deposit currently reserved
    modifier hasDepositReserved() {
        // Get the node settings
        rocketNodeSettings = RocketNodeSettingsInterface(rocketStorage.getAddress(keccak256(abi.encodePacked("contract.name", "rocketNodeSettings"))));
        require(depositReservation.exists && now < (depositReservation.created + rocketNodeSettings.getDepositReservationTime()), "Node does not have a current deposit reservation, please make one first before sending ether/rpl.");
        _;
    }

     
    /*** Constructor *************/

    /// @dev RocketNodeContract constructor
    constructor(address _rocketStorageAddress, address _owner) public {
        // Version
        version = 1;
        // Update the storage contract address
        rocketStorage = RocketStorageInterface(_rocketStorageAddress);
        // Add the RPL contract address
        rplContract = ERC20(rocketStorage.getAddress(keccak256(abi.encodePacked("contract.name", "rocketPoolToken"))));
        // Set the node owner
        owner = _owner;
    }


    /*** Getters *************/

    /// @dev Returns the nodes owner - its coinbase account
    function getOwner() public view returns(address) { 
        return owner;
    }

    /// @dev Returns true if there is a current deposit reservation
    function getHasDepositReservation() public hasDepositReserved() returns(bool) { 
        return true;
    }

    /// @dev Returns the time of the deposit reservation
    function getDepositReservedTime() public hasDepositReserved() returns(uint256) { 
        return depositReservation.created;
    }

    /// @dev Returns the current deposit reservation ether required
    function getDepositReserveEtherRequired() public hasDepositReserved() returns(uint256) { 
        return depositReservation.etherAmount;
    }

    /// @dev Returns the current deposit reservation RPL required
    function getDepositReserveRPLRequired() public hasDepositReserved() returns(uint256) { 
        return depositReservation.rplAmount;
    }

    /// @dev Returns the current deposit reservation duration set
    function getDepositReserveDurationID() public hasDepositReserved() returns(string) { 
        return depositReservation.durationID;
    }

    
    /*** Setters *************/

    
    /*** Methods *************/

    /// @dev Reserves a deposit of Ether/RPL at the current rate. The node operator has 24hrs to deposit both once its locked in or it will expire.
    /// @param _amount The amount of ether the node operator wishes to deposit
    /// @param _durationID The ID that determines which pool the user intends to join based on the staking blocks of that pool (3 months, 6 months etc)
    function depositReserve(uint256 _amount, string _durationID) public returns(bool) { 
       // Get the node API
       rocketNodeAPI = RocketNodeAPIInterface(rocketStorage.getAddress(keccak256(abi.encodePacked("contract.name", "rocketNodeAPI"))));
       // Returns the amount of RPL required for a single ether
       uint256 rplRatio = rocketNodeAPI.getRPLRatio(_durationID); 
       // Verify the deposit is acceptable 
       if(rocketNodeAPI.getDepositReservationIsValid(msg.sender, _amount, _durationID, rplRatio, depositReservation.created)) {  
            // How much RPL do we need for this deposit?
            uint256 rplAmount = (_amount.mul(rplRatio)).div(1 ether);
            // Record the reservation now
            depositReservation = DepositReservation({
                durationID: _durationID,
                etherAmount: _amount,
                rplAmount: rplAmount,
                rplRatio: rplRatio,
                created: now,
                exists: true
            });
            // All good? Fire the event for the new deposit
            emit NodeDepositReservation(msg.sender, _amount, rplAmount, _durationID, rplRatio, now);   
            // Done
            return true;
        }
        // Safety
        return false;    
    }


   /// @dev Cancel a deposit reservation that was made - only node owner
   function depositReserveCancel() public onlyNodeOwner() hasDepositReserved() returns(bool) { 
        // Get reservation time
        uint256 reservationTime = depositReservation.created;
        // Delete the reservation
        delete depositReservation;
        // Log it
        emit NodeDepositReservationCancelled(msg.sender, reservationTime, now);
        // Done
        return true;
    }


   /// @notice Send `msg.value ether` Eth from the account of `message.caller.address()`, to Rocket Pool node account contract at `to.address()`.
   /// @dev Deposit to Rocket Pool from a node to their own contract. Anyone can deposit to a nodes contract, but they must have the ether/rpl to do so. User must have a reserved deposit and the RPL required to cover the ether deposit.
   function deposit() public payable hasDepositReserved() returns(bool) { 
        // Get the node API
        rocketNodeAPI = RocketNodeAPIInterface(rocketStorage.getAddress(keccak256(abi.encodePacked("contract.name", "rocketNodeAPI"))));
        // Check the contract has sufficient RPL balance for the reserved deposit
        require(getDepositReserveRPLRequired() <= rplContract.balanceOf(address(this)), "Node contract does not have enough RPL to cover the reserved ether deposit.");
        // It does, lets make the amount reserved for the nodeAPI ok to move
        require(rplContract.approve(address(rocketNodeAPI), getDepositReserveRPLRequired()), "Error approving the RPL transfer for this nodes contract.");
        // Verify the deposit is acceptable and create a minipool for it 
        if(rocketNodeAPI.deposit(owner)) {    
            // Delete the reservation
            delete depositReservation;
            // Done
            return true;
        }
        // Safety
        return false;    
    }


    

}