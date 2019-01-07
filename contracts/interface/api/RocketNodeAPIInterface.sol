pragma solidity 0.5.0; 


// Our node interface
contract RocketNodeAPIInterface {
    // Getters
    function getContract(address _nodeAddress) public view returns (address);
    function checkDepositReservationIsValid(address _from, uint256 _value, string memory _durationID, uint256 _lastDepositReservedTime) public;
    function getRPLRatio(string memory _durationID) public returns(uint256);
    function getRPLRequired(uint256 _weiAmount, string memory _durationID) public returns(uint256, uint256);
    // Methods
    function add(string memory _timezoneLocation) public returns (bool);
    function deposit(address _nodeOwner) public returns(address[] memory);
    function checkin(address _nodeOwner, uint256 _averageLoad, uint256 _nodeFeeVote) public returns(bool);
}