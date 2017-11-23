// Testing a single unit test

const os = require('os');
const rocketHub = artifacts.require('./contract/RocketHub.sol');
const rocketPool = artifacts.require('./contract/RocketPool.sol');
const rocketPoolMini = artifacts.require('./contract/RocketPoolMini.sol');
const rocketSettings = artifacts.require('./contract/RocketSettings.sol');

const displayEvents = false;

// Display events triggered during the tests
if (displayEvents) {
  rocketPool.deployed().then(rocketPoolInstance => {
    const eventWatch = rocketPoolInstance
      .allEvents({
        fromBlock: 0,
        toBlock: 'latest',
      })
      .watch((error, result) => {
        // Print the event to console
        const printEvent = (type, result, colour) => {
          console.log('\n');
          console.log(
            colour,
            '*** ' + type.toUpperCase() + ' EVENT: ' + result.event + ' *******************************'
          );
          console.log('\n');
          console.log(result.args);
          console.log('\n');
        };
        // This will catch all events, regardless of how they originated.
        if (error == null) {
          // Print the event
          printEvent('rocket', result, '\x1b[33m%s\x1b[0m:');
          // Listen for new pool events too
          if (result.event == 'PoolCreated') {
            // Get an instance of that pool
            const poolInstance = rocketPoolMini.at(result.args._address);
            // Watch for events in mini pools also as with the main contract
            const poolEventWatch = poolInstance
              .allEvents({
                fromBlock: 0,
                toBlock: 'latest',
              })
              .watch((error, result) => {
                // This will catch all pool events, regardless of how they originated.
                if (error == null) {
                  printEvent('minipool', result, '\x1b[32m%s\x1b[0m');
                }
              });
          }
        }
      });
  });
}

contract('RocketPool', accounts => {
  // User accounts
  const userFirst = accounts[1];
  // Estimate the correct withdrawal based on %
  it('Estimate the correct withdrawal based on %', () => {
    // RocketPool now
    return rocketPool.deployed().then(rocketPoolInstance => {
      // Transaction
      return rocketPoolInstance
        .userWithdrawDepositTest({ from: userFirst, to: rocketPoolInstance.address, gas: 250000 })
        .then(result => {
          result.logs.forEach(log => {
            if (log.event == 'FlagUint' || log.event == 'FlagInt') {
              console.log(web3.fromWei(log.args.flag.valueOf(), 'ether'));
            }
            return result;
          });
          return result;
        })
        .then(result => {
          assert.isTrue(result, 'Single Unit Test Failed');
        });
    });
  }); // End Test
});
