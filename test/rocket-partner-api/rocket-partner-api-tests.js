import { printTitle, assertThrows } from '../utils';
import { RocketSettings } from '../artifacts';
import { scenarioRegisterPartner, scenarioPartnerDeposit, scenarioRemovePartner } from './rocket-partner-api-scenarios';

export function rocketPartnerAPIRegistrationTests({
    owner,
    accounts,
    userFirst,
    partnerFirst,
    partnerFirstName,
    partnerSecond,
    partnerSecondName,
    partnerRegisterGas
}) {

    describe('RocketPartnerAPI - Registration', async () => {


        // Try to register a new partner as a non rocket pool owner
        it(printTitle('non owner', 'fail to register a partner'), async () => {
            await assertThrows(scenarioRegisterPartner({
                partnerAddress: partnerFirst,
                partnerName: partnerFirstName,
                fromAddress: userFirst,
                gas: partnerRegisterGas
            }));
        });


        // Register two 3rd party partners
        it(printTitle('owner', 'register 2 partners'), async () => {

            // Register first partner
            await scenarioRegisterPartner({
                partnerAddress: partnerFirst,
                partnerName: partnerFirstName,
                fromAddress: owner,
                gas: partnerRegisterGas
            });

            // Register second partner
            await scenarioRegisterPartner({
                partnerAddress: partnerSecond,
                partnerName: partnerSecondName,
                fromAddress: owner,
                gas: partnerRegisterGas
            });

        });


    });

}

export function rocketPartnerAPIDepositTests1({
    owner,
    accounts,
    userSecond,
    userThird,
    partnerFirst,
    partnerFirstUserAccount,
    rocketDepositGas
}) {

    describe('RocketPartnerAPI - Deposits', async () => {


        // Contract dependencies
        let rocketSettings;
        before(async () => {
            rocketSettings = await RocketSettings.deployed();
        });


        // Attempt to make a deposit with an incorrect pool staking time ID
        it(printTitle('partnerFirst', 'fail to deposit with an incorrect pool staking time ID'), async () => {

            // Calculate just enough ether to create a minipool
            const minEther = await rocketSettings.getMiniPoolLaunchAmount.call();
            const sendAmount = minEther.valueOf() - web3.toWei('1', 'ether');

            // Deposit on behalf of the partner with an invalid pool staking time ID
            await assertThrows(scenarioPartnerDeposit({
                userAddress: partnerFirstUserAccount,
                stakingTimeID: 'beer',
                fromAddress: partnerFirst,
                depositAmount: sendAmount,
                gas: rocketDepositGas,
            }));

        });


        // Attempt to make a deposit with an unregistered 3rd party partner
        it(printTitle('userThird', 'fail to deposit with an unregistered partner'), async () => {
            
            // Calculate just enough ether to create a minipool
            const minEther = await rocketSettings.getMiniPoolLaunchAmount.call();
            const sendAmount = minEther.valueOf() - web3.toWei('1', 'ether');

            // Deposit on behalf of an unregistered partner
            await assertThrows(scenarioPartnerDeposit({
                userAddress: userThird,
                stakingTimeID: 'short',
                fromAddress: userSecond,
                depositAmount: sendAmount,
                gas: rocketDepositGas,
            }));

        });


    });

}


import { RocketPartnerAPI, RocketPool, RocketPoolMini } from '../artifacts';


export function rocketPartnerAPIDepositTests2({
    owner,
    accounts,
    partnerFirst,
    partnerFirstUserAccount,
    rocketDepositGas
}) {

    describe('RocketPartnerAPI - Deposits', async () => {


        // Contract dependencies
        let rocketSettings;
        before(async () => {
            rocketSettings = await RocketSettings.deployed();
        });


        let rocketPartnerAPI;
        let rocketPool;
        before(async () => {
            rocketPartnerAPI = await RocketPartnerAPI.deployed();
            rocketPool = await RocketPool.deployed();
        });


        // Another user (partner user) sends a deposit and has a new pool accepting deposits created for them as the previous one is now in countdown to launch mode and not accepting deposits
        it(printTitle('partnerFirst', 'send ether to RP on behalf of their user, second minipool is created for them and is accepting deposits'), async () => {
            // Get the min ether required to launch a minipool
            const minEther = await rocketSettings.getMiniPoolLaunchAmount.call().valueOf();
            // Send Ether as a user, but send just enough to create the pool, but not launch it
            const sendAmount = parseInt(minEther) - parseInt(web3.toWei('1', 'ether'));
            // Deposit on a behalf of the partner and also specify the pool staking time ID
            const result = await rocketPartnerAPI.APIpartnerDeposit(partnerFirstUserAccount, 'short', {
                from: partnerFirst,
                value: sendAmount,
                gas: rocketDepositGas,
            });

            const log = result.logs.find(({ event }) => event == 'APIpartnerDepositAccepted');
            assert.notEqual(log, undefined); // Check that an event was logged

            const userPartnerAddress = log.args._partner;

            // Now find the pools our users belongs too, should just be one
            const pools = await rocketPool.getPoolsFilterWithUser
            .call(partnerFirstUserAccount, { from: partnerFirst })
            .valueOf();

            // Get an instance of that pool and do further checks
            const miniPool = RocketPoolMini.at(pools[0]);
            const poolStatus = await miniPool.getStatus.call().valueOf();
            const poolBalance = web3.eth.getBalance(miniPool.address).valueOf();

            // Now just count the users to make sure this user is the only one in this new pool
            const userCount = await miniPool.getUserCount.call().valueOf();

            assert.equal(poolStatus, 0, 'Invalid pool status');
            assert.equal(poolBalance, sendAmount, 'Pool balance and send amount does not match');
            assert.equal(userPartnerAddress, partnerFirst, 'Partner address does not match');
            assert.equal(pools.length, 1, 'Final number of pools does not match');
        });


    });

}

export function rocketPartnerAPIWithdrawalTests({
    owner,
    accounts,
    partnerFirst,
    partnerFirstUserAccount,
    rocketWithdrawalGas
}) {

    describe('RocketPartnerAPI - Withdrawals', async () => {


        let rocketPartnerAPI;
        let rocketPool;
        before(async () => {
            rocketPartnerAPI = await RocketPartnerAPI.deployed();
            rocketPool = await RocketPool.deployed();
        });


        // First partner withdraws half their users previous Ether from the pool before it has launched for staking
        it(printTitle('partnerFirst', 'withdraws half their users previous deposit from the minipool'), async () => {
            // Get the user deposit total
            const pools = await rocketPool.getPoolsFilterWithUserDeposit.call(partnerFirstUserAccount).valueOf();
            assert.equal(pools.length, 1);

            // Get an instance of that pool and do further checks
            const miniPool = RocketPoolMini.at(pools[0]);
            const poolStatus = await miniPool.getStatus.call().valueOf();

            // Get the user deposit
            const depositedAmount = await miniPool.getUserDeposit.call(partnerFirstUserAccount).valueOf();
            const withdrawalAmount = depositedAmount / 2;

            // Withdraw half our deposit now through the main parent contract
            await rocketPartnerAPI.APIpartnerWithdrawal(miniPool.address, withdrawalAmount, partnerFirstUserAccount, {
                from: partnerFirst,
                gas: 4000000,
            });

            // Get our balance again
            const depositedAmountAfter = await miniPool.getUserDeposit.call(partnerFirstUserAccount).valueOf();

            assert.equal(depositedAmountAfter, depositedAmount - withdrawalAmount, 'Deposited amoint does not match');
        });


        // First partner user withdraws the remaining deposit from the minipool, their user is removed from it and the minipool is destroyed as it has no users anymore
        it(printTitle('partnerFirst', 'withdraws their users remaining deposit from the minipool, their user is removed from it and the minipool is destroyed as it has no users anymore'), async () => {
            // Get the users deposit total
            const pools = await rocketPool.getPoolsFilterWithUserDeposit.call(partnerFirstUserAccount).valueOf();
            assert.equal(pools.length, 1);

            // Get an instance of that pool and do further checks
            const miniPool = RocketPoolMini.at(pools[0]);
            const depositedAmount = await miniPool.getUserDeposit.call(partnerFirstUserAccount).valueOf();
            const withdrawalAmount = depositedAmount;

            // Withdraw our deposit now through the main parent contract
            await rocketPartnerAPI.APIpartnerWithdrawal(miniPool.address, withdrawalAmount, partnerFirstUserAccount, {
                from: partnerFirst,
                gas: rocketWithdrawalGas,
            });

            // See if Rocket Pool still recognises the pool contract after its been removed and self destructed
            const result = await rocketPool.getPoolExists.call(pools[0]).valueOf();
            assert.isFalse(result, 'Minipool exists when it should have been destroyed');
        });


    });

}

export function rocketPartnerAPIRemovalTests({
    owner,
    accounts,
    partnerFirst,
    partnerSecond
}) {

    describe('RocketPartnerAPI - Removal', async () => {


        // Owner removes first partner - users attached to this partner can still withdraw
        it(printTitle('owner', 'removes first partner from the Rocket Pool network'), async () => {
            await scenarioRemovePartner({
                partnerAddress: partnerFirst,
                newerPartnerAddress: partnerSecond,
                fromAddress: owner,
                gas: 500000,
            });
        });


    });

}

export function rocketPartnerAPIDepositTests3({
    owner,
    accounts,
    partnerFirst,
    partnerFirstUserAccount,
    rocketDepositGas,
}) {

    describe('RocketPartnerAPI - Deposits', async () => {


        // Contract dependencies
        let rocketSettings;
        before(async () => {
            rocketSettings = await RocketSettings.deployed();
        });


        // Attempt to make a deposit after being removed as a partner
        it(printTitle('partnerFirst', 'attempt to make a deposit after being removed as a partner'), async () => {

            // Calculate just enough ether to create a minipool
            const minEther = await rocketSettings.getMiniPoolLaunchAmount.call();
            const sendAmount = minEther.valueOf() - web3.toWei('1', 'ether');

            // Attempt deposit
            await assertThrows(scenarioPartnerDeposit({
                userAddress: partnerFirstUserAccount,
                stakingTimeID: 'short',
                fromAddress: partnerFirst,
                depositAmount: sendAmount,
                gas: rocketDepositGas,
            }));

        });


    });

}
