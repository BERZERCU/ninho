const test=require('node:test'),assert=require('node:assert/strict');
const {changes}=require('../js/point-effects.js');
test('first load and unchanged confirmed balances do not animate',()=>{assert.deepEqual(changes(null,{balance:8,earned:8}),[]);assert.deepEqual(changes({balance:2,earned:4},{balance:2,earned:4}),[])});
test('confirmed free and plus rewards use the actual server amount',()=>{assert.deepEqual(changes({balance:2,earned:4},{balance:3,earned:5}),[1]);assert.deepEqual(changes({balance:2,earned:4},{balance:4,earned:6}),[2])});
test('spending animates the debit; simultaneous earnings are not lost',()=>{assert.deepEqual(changes({balance:5,earned:8},{balance:3,earned:8}),[-2]);assert.deepEqual(changes({balance:5,earned:8},{balance:4,earned:9}),[1,-2])});
test('invalid snapshots and identity resets cannot fabricate rewards',()=>{assert.deepEqual(changes({balance:2,earned:4},{balance:0,earned:0}),[]);assert.deepEqual(changes({balance:2,earned:4},{balance:50,earned:4}),[]);assert.deepEqual(changes({balance:NaN,earned:4},{balance:3,earned:5}),[])});
