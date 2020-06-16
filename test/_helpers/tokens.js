import { RocketETHToken, RocketNodeETHToken } from '../_utils/artifacts';


// Get the rETH balance of an address
export async function getRethBalance(address) {
    const rocketETHToken = await RocketETHToken.deployed();
    let balance = rocketETHToken.balanceOf.call(address);
    return balance;
}


// Get the current rETH exchange rate
export async function getRethExchangeRate() {
    const rocketETHToken = await RocketETHToken.deployed();
    let exchangeRate = await rocketETHToken.getExchangeRate.call();
    return exchangeRate;
}


// Get the nETH balance of an address
export async function getNethBalance(address) {
    const rocketNodeETHToken = await RocketNodeETHToken.deployed();
    let balance = rocketNodeETHToken.balanceOf.call(address);
    return balance;
}

