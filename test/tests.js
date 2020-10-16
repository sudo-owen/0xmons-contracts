const Blockmon = artifacts.require('./Blockmon.sol');
const erc20 = artifacts.require('./TestERC20.sol');
const erc721 = artifacts.require('./TestERC721.sol');
const truffleAssert = require('truffle-assertions');

contract("Blockmon tests 1", async accounts => {
  it ("allows setting all of the variables", async() => {
    let flag1 = 100;
    let result;
    let blockmonInst = await Blockmon.deployed();

    // uint256 public minStakeTime;
    await blockmonInst.setMinStakeAmt(flag1, {from:accounts[0]});
    result = await blockmonInst.minStakeAmt.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;

    // uint256 public minStakeTime;
    await blockmonInst.setMinStakeTime(flag1, {from:accounts[0]});
    result = await blockmonInst.minStakeTime.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;

    // uint256 public tokenPrice;
    await blockmonInst.setTokenPrice(flag1, {from:accounts[0]});
    result = await blockmonInst.tokenPrice.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;
  
    // uint256 public generation;
    await blockmonInst.setSeries(flag1, {from:accounts[0]});
    result = await blockmonInst.series.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;

    // uint256 public maxMons;
    await blockmonInst.setMaxMons(flag1, {from:accounts[0]});
    result = await blockmonInst.maxMons.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;

    // uint256 public mergeTime;
    await blockmonInst.setMergeTime(flag1, {from:accounts[0]});
    result = await blockmonInst.mergeTime.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;

    // uint256 public mergePrice;
    await blockmonInst.setMergePrice(flag1, {from:accounts[0]});
    result = await blockmonInst.mergePrice.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;

    // uint256 public genMergeLag;
    await blockmonInst.setGenMergeLag(flag1, {from:accounts[0]});
    result = await blockmonInst.genMergeLag.call();
    assert.equal(result.toNumber(), flag1);
    flag1 += 1;
  });
});

contract("Blockmon tests 2", async accounts => {
  it ("allows buying of the monster directly", async() => {
    let blockmonInst = await Blockmon.deployed();
    let erc20Inst = await erc20.deployed();
    let result;

    await erc20Inst.giveTokens(100, {from: accounts[0]});
    await erc20Inst.approve(blockmonInst.address, 100000, {from:accounts[0]});
    await blockmonInst.setTokenAddress(erc20Inst.address, {from:accounts[0]});
    await blockmonInst.setTokenPrice(1, {from:accounts[0]});
    await blockmonInst.setMaxMons(100, {from:accounts[0]});

    // Checks that buying normally works
    let numMonsMinted = 10;
    for (let i = 0; i < numMonsMinted; i++) {
      await blockmonInst.buyMonster();
    }
    result = await blockmonInst.balanceOf(accounts[0]);
    assert.equal(result.toNumber(), numMonsMinted);
    result = await blockmonInst.numMonsCreated.call();
    assert.equal(result.toNumber(), numMonsMinted);

    // Checks that buying fails when we set the price to be > current balance
    await blockmonInst.setTokenPrice(1000, {from:accounts[0]});
    await truffleAssert.reverts(
      blockmonInst.buyMonster({from:accounts[0]})
    );

    // Checks that buying fails when the number of monsters is set to a small number
    await blockmonInst.setMaxMons(1, {from:accounts[0]});
    await truffleAssert.reverts(
      blockmonInst.buyMonster({from:accounts[0]})
    );
  });
});

contract("Blockmon tests 3", async accounts => {
  it ("allows burning gems for monsters", async() => {
    let blockmonInst = await Blockmon.deployed();
    let erc721Inst = await erc721.deployed();
    let result;
    let id = 1;

    await blockmonInst.setMaxMons(100, {from:accounts[0]});
    await erc721Inst.mintReward(10, 20, {from:accounts[0]});
    await erc721Inst.approve(blockmonInst.address, id);
    await blockmonInst.setNFTAddress(erc721Inst.address, {from:accounts[0]});
    await blockmonInst.setMinStakeAmt(10, {from:accounts[0]});
    await blockmonInst.setMinStakeTime(20, {from:accounts[0]});
    await blockmonInst.setMaxMons(100, {from:accounts[0]});

    // Checks that normal mining works
    await blockmonInst.mineMonster(1, {from:accounts[0]});
    result = await blockmonInst.balanceOf(accounts[0]);
    assert.equal(result.toNumber(), 1);

    // Checks that the new monster has the right amount and duration
    result = await blockmonInst.monRecords(1);
    assert.equal(
      result.amount.toNumber(), 10
    );
    assert.equal(
      result.duration.toNumber(), 20
    );

    // Checks that a stake with too little amount will fail
    id += 1;
    await erc721Inst.mintReward(1, 20, {from:accounts[0]});
    await erc721Inst.approve(blockmonInst.address, id);
    await truffleAssert.reverts(
      blockmonInst.mineMonster(id, {from:accounts[0]})
    );
    
    // Checks that a stake with too little duration will fail
    id += 1;
    await erc721Inst.mintReward(10, 2, {from:accounts[0]});
    await erc721Inst.approve(blockmonInst.address, id);
    await truffleAssert.reverts(
      blockmonInst.mineMonster(id, {from:accounts[0]})
    );

    // Checks that a stake with too little of both will fail
    id += 1;
    await erc721Inst.mintReward(1, 2, {from:accounts[0]});
    await erc721Inst.approve(blockmonInst.address, id);
    await truffleAssert.reverts(
      blockmonInst.mineMonster(id, {from:accounts[0]})
    );

    // Checks that mining will fail when the max mons is set to a small number
    id += 1;
    await blockmonInst.setMaxMons(1, {from:accounts[0]});
    await erc721Inst.mintReward(10, 20, {from:accounts[0]});
    await erc721Inst.approve(blockmonInst.address, id);
    await truffleAssert.reverts(
      blockmonInst.mineMonster(id, {from:accounts[0]})
    );
  });
});


contract("Blockmon tests 4", async accounts => {
  it ("allows you to merge two monsters", async()=> {
    let blockmonInst = await Blockmon.deployed();
    let erc20Inst = await erc20.deployed();
    let result;

    let mergeTime = 10000000;
    let genMergeLag = mergeTime;

    await erc20Inst.giveTokens(100, {from: accounts[0]});
    await erc20Inst.approve(blockmonInst.address, 100000, {from:accounts[0]});
    await blockmonInst.setTokenAddress(erc20Inst.address, {from:accounts[0]});
    await blockmonInst.setTokenPrice(1, {from:accounts[0]});
    await blockmonInst.setMaxMons(100, {from:accounts[0]});

    // Buy 10 monsters
    let numMonsMinted = 10;
    for (let i = 0; i < numMonsMinted; i++) {
      await blockmonInst.buyMonster();
    }

    await blockmonInst.setCanMerge(true, {from:accounts[0]});
    await blockmonInst.setMergeTime(mergeTime, {from:accounts[0]});

    // Check if you can merge two monsters normally
    await blockmonInst.mergeMonsters(1, 2, {from:accounts[0]});
    numMonsMinted += 1;
    result = await blockmonInst.balanceOf(accounts[0]);
    assert.equal(result.toNumber(), numMonsMinted);

    // Do it again
    await blockmonInst.mergeMonsters(3, 4, {from:accounts[0]});
    numMonsMinted += 1;
    result = await blockmonInst.balanceOf(accounts[0]);
    assert.equal(result.toNumber(), numMonsMinted);

    // Checks that you can't just merge the same two monsters again
    // because of the mergeTime modifying unlockBlock
    truffleAssert.reverts(
      blockmonInst.mergeMonsters(1,2)
    );

    // Checks that the parents have a later unlockBlock
    result = await blockmonInst.monRecords(1);
    assert.isAtLeast(
      result.unlockBlock.toNumber(), mergeTime
    );
    result = await blockmonInst.monRecords(2);
    assert.isAtLeast(
      result.unlockBlock.toNumber(), mergeTime
    );

    // Checks that the new monster has a later unlockBlock
    result = await blockmonInst.monRecords(numMonsMinted);
    assert.isAtLeast(
      result.unlockBlock.toNumber(), mergeTime
    );

    // Mine a second generation monster (?)
  });
});
