import { RocketDepositToken, RocketSettings, RocketUser } from '../artifacts';


// Withdraws deposit tokens and asserts that token supply and balances are correct
export async function scenarioWithdrawDepositTokens({miniPool, withdrawalAmount, fromAddress, gas}) {
    const rocketDeposit = await RocketDepositToken.deployed();
    const rocketSettings = await RocketSettings.deployed();
    const rocketUser = await RocketUser.deployed();

    // Get the initial total supply of tokens in circulation
    let totalTokenSupplyOld = await rocketDeposit.totalSupply.call({from: fromAddress});
    totalTokenSupplyOld = parseFloat(web3.fromWei(totalTokenSupplyOld.valueOf(), 'ether'));

    // Get user's initial token balance
    let userTokenBalanceOld = await rocketDeposit.balanceOf.call(fromAddress);
    userTokenBalanceOld = parseFloat(web3.fromWei(userTokenBalanceOld.valueOf(), 'ether'));

    // Get user's initial minipool ether balance
    let userEtherBalanceOld = await miniPool.getUserDeposit.call(fromAddress);

    // Withdraw tokens from user's minipool
    await rocketUser.userWithdrawDepositTokens(miniPool.address, withdrawalAmount, {
        from: fromAddress,
        gas: gas,
    });

    // Get the updated total supply of tokens in circulation
    let totalTokenSupplyNew = await rocketDeposit.totalSupply.call({from: fromAddress});
    totalTokenSupplyNew = parseFloat(web3.fromWei(totalTokenSupplyNew.valueOf(), 'ether'));

    // Get user's updated token balance
    let userTokenBalanceNew = await rocketDeposit.balanceOf.call(fromAddress);
    userTokenBalanceNew = parseFloat(web3.fromWei(userTokenBalanceNew.valueOf(), 'ether'));

    // Get user's updated minipool ether balance
    let userEtherBalanceNew = await miniPool.getUserDeposit.call(fromAddress);

    // Get user's expected token balance based on withdrawal amount and fees
    let tokenWithdrawalFee = await rocketSettings.getTokenRPDWithdrawalFeePerc.call();
    let tokenBalanceFeeIncurred = parseFloat(web3.fromWei(tokenWithdrawalFee.valueOf(), 'ether') * web3.fromWei(withdrawalAmount, 'ether'));
    let expectedUserTokenBalance = userTokenBalanceOld + (web3.fromWei(withdrawalAmount, 'ether') - tokenBalanceFeeIncurred);

    // Asserts
    assert.equal(userTokenBalanceNew, expectedUserTokenBalance, 'User\'s token balance is incorrect');
    assert.equal((totalTokenSupplyNew - totalTokenSupplyOld), (userTokenBalanceNew - userTokenBalanceOld), 'Token supply does not match user token balance increase');
    assert.equal(userEtherBalanceNew.valueOf(), (parseInt(userEtherBalanceOld.valueOf()) - withdrawalAmount), 'User\'s minipool ether balance was not updated correctly');

}


// Transfers deposit tokens and asserts that tokens were transferred successfully
export async function scenarioTransferDepositTokens({fromAddress, toAddress, amount, gas, checkTransferred = true}) {
    const rocketDeposit = await RocketDepositToken.deployed();

    // Get initial address token balances
    let fromTokenBalanceOld = await rocketDeposit.balanceOf.call(fromAddress);
    let toTokenBalanceOld = await rocketDeposit.balanceOf.call(toAddress);

    // Transfer tokens
    await rocketDeposit.transfer(toAddress, amount, {from: fromAddress, gas: gas});

    // Get updated address token balances
    let fromTokenBalanceNew = await rocketDeposit.balanceOf.call(fromAddress);
    let toTokenBalanceNew = await rocketDeposit.balanceOf.call(toAddress);

    // Assert that token balances were updated correctly
    if (checkTransferred) {
        assert.equal(fromTokenBalanceNew.valueOf(), parseInt(fromTokenBalanceOld.valueOf()) - amount, 'From address token balance was not updated correctly');
        assert.equal(toTokenBalanceNew.valueOf(), parseInt(toTokenBalanceOld.valueOf()) + amount, 'To address token balance was not updated correctly');
    }

}


// Transfers deposit tokens using transferFrom and asserts that tokens were transferred successfully
export async function scenarioTransferDepositTokensFrom({fromAddress, toAddress, amount, gas, checkTransferred = true}) {

    

}

