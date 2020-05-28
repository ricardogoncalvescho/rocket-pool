pragma solidity 0.6.8;

// SPDX-License-Identifier: GPL-3.0-only

interface RocketPoolInterface {
    function getTotalETHBalance() external view returns (uint256);
    function getStakingETHBalance() external view returns (uint256);
    function increaseTotalETHBalance(uint256 _amount) external;
	function decreaseTotalETHBalance(uint256 _amount) external;
    function getETHUtilizationRate() external view returns (uint256);
    function getNodeDemand() external view returns (uint256);
    function getNodeFee() external view returns (uint256);
    function getValidatorNodeShare(uint256 _balance) external view returns (uint256);
}
