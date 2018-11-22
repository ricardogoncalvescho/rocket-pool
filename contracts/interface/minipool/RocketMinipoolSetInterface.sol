pragma solidity 0.5.0;

contract RocketMinipoolSetInterface {
    function getNextActiveMinipool(string memory _durationID, uint256 _seed) public returns (address);
    function removeActiveMinipool(string memory _durationID, address _miniPoolAddress) public;
}
