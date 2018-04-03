import { printTitle, assertThrows } from '../utils';
import { RocketDepositToken } from '../artifacts';
import { scenarioWithdrawDepositTokens, scenarioBurnDepositTokens, scenarioTransferDepositTokens, scenarioTransferDepositTokensFrom } from './rocket-deposit-scenarios';

export default function({
    owner,
    accounts,
    userFirst,
    userThird,
    miniPools
}) {

    describe('RocketDepositToken', async () => {


        // Contract dependencies
        let rocketDeposit;
        before(async () => {
            rocketDeposit = await RocketDepositToken.deployed();
        });


        it(printTitle('userThird', 'withdraws 50% of their deposit as Rocket Deposit Tokens while their minipool is staking with Casper'), async () => {

            // Third user deposited the min required to launch a pool earlier, we need this amount so we can calculate 50%
            const userDeposit = await miniPools.second.getUserDeposit.call(userThird);
            const withdrawHalfAmount = parseInt(userDeposit.valueOf()) / 2;

            // Withdraw tokens from user's minipool
            await scenarioWithdrawDepositTokens({
                miniPool: miniPools.second,
                withdrawalAmount: withdrawHalfAmount,
                fromAddress: userThird,
                gas: 250000,
            });

        });


        it(printTitle('userThird', 'transfers half of their deposit tokens to userFirst on the open market'), async () => {

            // Get token transfer amount
            const userThirdTokenBalance = await rocketDeposit.balanceOf.call(userThird);
            const tokenTransferAmount = parseInt(userThirdTokenBalance.valueOf()) / 2;
            
            // Transfer deposit tokens
            await scenarioTransferDepositTokens({
                fromAddress: userThird,
                toAddress: userFirst,
                amount: tokenTransferAmount,
                gas: 250000,
            });

        });


        it(printTitle('userThird', 'fails to transfer more tokens than they own on the open market'), async () => {

            // Get invalid token transfer amount
            const userThirdTokenBalance = await rocketDeposit.balanceOf.call(userThird);
            const tokenTransferAmount = parseInt(userThirdTokenBalance.valueOf()) + 10000;

            // Transfer deposit tokens
            await scenarioTransferDepositTokens({
                fromAddress: userThird,
                toAddress: userFirst,
                amount: tokenTransferAmount,
                gas: 250000,
                checkTransferred: false,
            });

            // Get user token balance
            const userThirdTokenBalanceAfter = await rocketDeposit.balanceOf.call(userThird);

            // Check that no tokens were sent
            assert.equal(userThirdTokenBalanceAfter.valueOf(), userThirdTokenBalance.valueOf(), 'Users tokens were transferred');

        });


        it(printTitle('userThird', 'fails to transfer tokens from userFirst account to themselves on the open market'), async () => {

            // Get token transfer amount
            const userFirstTokenBalance = await rocketDeposit.balanceOf.call(userFirst);
            const tokenTransferAmount = parseInt(userFirstTokenBalance.valueOf()) / 2;

            // Transfer deposit tokens
            await scenarioTransferDepositTokensFrom({
                fromAddress: userFirst,
                toAddress: userThird,
                amount: tokenTransferAmount,
                gas: 250000,
                checkTransferred: false,
            });

            // Get user token balance
            const userFirstTokenBalanceAfter = await rocketDeposit.balanceOf.call(userFirst);

            // Check that no tokens were sent
            assert.equal(userFirstTokenBalanceAfter.valueOf(), userFirstTokenBalance.valueOf(), 'Users tokens were transferred');

        });


        it(printTitle('userThird', 'fails to trade their tokens for ether in the rocket deposit token fund as it does not have enough ether to cover the amount sent'), async () => {

            // Get amount of tokens to burn
            const userThirdTokenBalance = await rocketDeposit.balanceOf.call(userThird);
            const tokenBurnAmount = parseInt(userThirdTokenBalance.valueOf());

            // Burn tokens for ether
            await assertThrows(scenarioBurnDepositTokens({
                burnAmount: tokenBurnAmount,
                fromAddress: userThird,
                gas: 250000,
            }));

        });


    });

}
