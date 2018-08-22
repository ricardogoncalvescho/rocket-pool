import { printTitle, assertThrows } from '../_lib/utils/general';
import { RocketListStorage } from '../_lib/artifacts'
import { scenarioWriteBool } from './rocket-storage-scenarios';
import { scenarioPushListItem, scenarioSetListItem, scenarioInsertListItem, scenarioRemoveOListItem, scenarioRemoveUListItem } from './rocket-list-storage-scenarios';

export default function({owner}) {

    contract('RocketStorage', async (accounts) => {


        // Owners direct access to storage is removed after initialisation when deployed
        it(printTitle('owner', 'fail to access storage directly after deployment'), async () => {
            await assertThrows(scenarioWriteBool({
                key: web3.sha3('test.access'),
                value: true,
                fromAddress: owner,
                gas: 250000,
            }));
        });


    });

    contract('RocketListStorage', async (accounts) => {


        // Contract dependencies
        let rocketListStorage;
        before(async () => {
            rocketListStorage = await RocketListStorage.deployed();
        });


        // Push an item onto a list
        it(printTitle('-----', 'push an item onto a list'), async () => {

            // Push items
            await scenarioPushListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                value: '0x0000000000000000000000000000000000000001',
                fromAddress: owner,
                gas: 500000,
            });
            await scenarioPushListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                value: '0x0000000000000000000000000000000000000002',
                fromAddress: owner,
                gas: 500000,
            });
            await scenarioPushListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                value: '0x0000000000000000000000000000000000000003',
                fromAddress: owner,
                gas: 500000,
            });

        });


        // Set a list item at index
        it(printTitle('-----', 'set a list item at index'), async () => {

            // Set item
            await scenarioSetListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 1,
                value: '0x0000000000000000000000000000000000000004',
                fromAddress: owner,
                gas: 500000,
            });

            // Set item at out of bounds index
            await assertThrows(scenarioSetListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 99,
                value: '0x0000000000000000000000000000000000000099',
                fromAddress: owner,
                gas: 500000,
            }), 'Set a list item with an out of bounds index');

        });


        // Insert an item into a list at index
        it(printTitle('-----', 'insert an item into a list at index'), async () => {

            // Insert item
            await scenarioInsertListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 1,
                value: '0x0000000000000000000000000000000000000005',
                fromAddress: owner,
                gas: 500000,
            });

            // Insert item at end of list
            let count = await rocketListStorage[`getAddressListCount`].call(web3.sha3('test.addresses'));
            await scenarioInsertListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: count,
                value: '0x0000000000000000000000000000000000000006',
                fromAddress: owner,
                gas: 500000,
            });

            // Insert item at out of bounds index
            await assertThrows(scenarioInsertListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 99,
                value: '0x0000000000000000000000000000000000000099',
                fromAddress: owner,
                gas: 500000,
            }), 'Inserted a list item with an out of bounds index');

        });


        // Remove an item from an ordered list at index
        it(printTitle('-----', 'remove an item from an ordered list at index'), async () => {

            // Remove item
            await scenarioRemoveOListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 2,
                fromAddress: owner,
                gas: 500000,
            });

            // Remove item at out of bounds index
            await assertThrows(scenarioRemoveOListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 99,
                fromAddress: owner,
                gas: 500000,
            }), 'Removed a list item with an out of bounds index');

        });


        // Remove an item from an unordered list at index
        it(printTitle('-----', 'remove an item from an unordered list at index'), async () => {

            // Remove item
            await scenarioRemoveUListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 1,
                fromAddress: owner,
                gas: 500000,
            });

            // Remove item at end of list
            let count = await rocketListStorage[`getAddressListCount`].call(web3.sha3('test.addresses'));
            await scenarioRemoveUListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: count - 1,
                fromAddress: owner,
                gas: 500000,
            });

            // Remove an item at out of bounds index
            await assertThrows(scenarioRemoveUListItem({
                type: 'Address',
                key: web3.sha3('test.addresses'),
                index: 99,
                fromAddress: owner,
                gas: 500000,
            }), 'Removed a list item with an out of bounds index');

        });


    });

};
