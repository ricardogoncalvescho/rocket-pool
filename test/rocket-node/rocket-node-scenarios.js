import { soliditySha3 } from '../utils';
import { RocketNode } from '../artifacts';


// Registers node and asserts that number of registered nodes increased
export async function scenarioRegisterNode({
    nodeAddress,
    valCodeAddress,
    addValCodeAddress = null,
    providerID,
    subnetID,
    instanceID,
    regionID,
    fromAddress,
    gas
}) {
    const rocketNode = await RocketNode.deployed();

    // Initialise add val code address
    if (!addValCodeAddress) addValCodeAddress = valCodeAddress;

    // Get initial node count
    let nodeCountOld = await rocketNode.getNodeCount.call();

    // Sign the message for the nodeAdd function to prove ownership of the address being registered
    let signature =  web3.eth.sign(nodeAddress, soliditySha3(valCodeAddress));

    // Register the node
    await rocketNode.nodeAdd(nodeAddress, providerID, subnetID, instanceID, regionID, addValCodeAddress, signature, {from: fromAddress, gas: gas});

    // Get updated node count
    let nodeCountNew = await rocketNode.getNodeCount.call();

    // Assert that updated node count is correct
    assert.equal(nodeCountNew.valueOf(), parseInt(nodeCountOld.valueOf()) + 1, 'Invalid number of nodes registered');

}

