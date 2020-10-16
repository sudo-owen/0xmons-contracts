pragma solidity ^0.6.1;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./INFTStaker.sol";

contract Blockmon is ERC721, Ownable {

  using SafeERC20 for IERC20;
  using Counters for Counters.Counter;

  Counters.Counter private _rewardIds;

  string public _contractURI;

  IERC20 public token;
  INFTStaker public nft;

  // number of created mons (not counting merges)
  uint256 public numMonsCreated;

  // tinkerable variables
  uint256 public minStakeTime;
  uint256 public minStakeAmt;
  uint256 public tokenPrice;
  uint256 public series;
  uint256 public maxMons;
  uint256 public mergePrice;
  uint256 public mergeTime;
  uint256 public genMergeLag;

  bool public canMerge;

  struct Mon {
    address miner;
    uint256 unlockBlock;
    uint256 parent1;
    uint256 parent2;
    uint256 gen;
    uint256 amount;
    uint256 duration;
    uint256 powerBits;
    uint256 series;
  }
  mapping(uint256 => Mon) public monRecords;

  constructor(string memory name, 
              string memory symbol) ERC721(name, symbol) public {
    minStakeAmt = 1;
    minStakeTime = 10000;
    tokenPrice = 1e18;
  }

  function _createNewMonster(address to,
                             uint256 unlockBlock,
                             uint256 parent1,
                             uint256 parent2,
                             uint256 gen,
                             uint256 amount, 
                             uint256 duration
                             // series is a global variable so no need to pass it in
                             ) private {
    _rewardIds.increment();
    uint256 currId = _rewardIds.current();
    monRecords[currId] = Mon(
      to,
      unlockBlock,
      parent1,
      parent2,
      gen,
      amount,
      duration,
      uint256(blockhash(block.number-1))+amount+duration,
      series
    );
    _safeMint(to, currId);
  }

  // Burn gem to get a new monster
  function mineMonster(uint256 gemId) public {
    require(nft.ownerOf(gemId) == msg.sender, "must use nft you own");

    (, uint256 amount, uint256 start, uint256 end, ) = nft.rewardRecords(gemId);
    if (end == 0) {
      end = block.number;
    }

    require((end-start) >= minStakeTime, "nft is not ready");
    require(amount >= minStakeAmt, "staked amt is not high enough");
    require(numMonsCreated < maxMons, "no new mons out yet");

    _createNewMonster(msg.sender,
                      0,
                      0,
                      0,
                      0,
                      amount, 
                      end-start);
    numMonsCreated += 1;
    nft.burn(gemId);
  }

  // Directly purchase monster with the set token
  function buyMonster() public {
    require(numMonsCreated < maxMons, "no new mons out yet");
    token.safeTransferFrom(msg.sender, address(this), tokenPrice);
    _createNewMonster(msg.sender,
                      0,
                      0,
                      0,
                      0,
                      0, 
                      0);
    numMonsCreated += 1;
  }
 
  // Breed a monster
  // Only allowed during certain times
  function mergeMonsters(uint256 id1, uint256 id2) public {
    require(canMerge == true, "can't merge yet");
    require(id1 != id2, "can't merge the same monster");

    // get refs to structs
    Mon memory mon1 = monRecords[id1];
    Mon memory mon2 = monRecords[id2];

    // ensure they are valid for merging
    require(mon1.unlockBlock < block.number, "not ready yet");
    require(mon2.unlockBlock < block.number, "not ready yet");
    require(ownerOf(id1) == msg.sender, "need to own monster");
    require(ownerOf(id2) == msg.sender, "need to own monster");

    // set both parent monsters to the new unlock date
    monRecords[id1].unlockBlock = block.number + mergeTime + mon1.gen*genMergeLag;
    monRecords[id2].unlockBlock = block.number + mergeTime + mon2.gen*genMergeLag;

    // set numAncestors1 to be the minimum of both
    uint256 gen1 = mon1.gen;
    uint256 gen2 = mon2.gen;
    if (gen2 < gen1) {
      gen1 = gen2;
    }

    // mint the user their merged monster
    _createNewMonster(
      msg.sender,
      block.number + mergeTime + gen1*genMergeLag,
      id1,
      id2,
      gen1+1,
      mon1.amount + mon2.amount,
      mon1.duration + mon2.duration
    );

    // Pay the merge fee
    token.safeTransferFrom(msg.sender, address(this), mergePrice);
  }

  function setMinStakeAmt(uint256 a) public onlyOwner {
    minStakeAmt = a;
  }

  function setMinStakeTime(uint256 t) public onlyOwner {
    minStakeTime = t;
  }

  function setTokenPrice(uint256 p) public onlyOwner {
    tokenPrice = p;
  }

  function setSeries(uint256 s) public onlyOwner {
    series = s;
  }

  function setMaxMons(uint256 m) public onlyOwner {
    maxMons = m;
  }

  function setMergePrice(uint256 p) public onlyOwner {
    mergePrice = p;
  }

  function setMergeTime(uint256 t) public onlyOwner {
    mergeTime = t;
  }

  function setGenMergeLag(uint256 g) public onlyOwner {
    genMergeLag = g;
  }

  function setCanMerge(bool b) public onlyOwner{
    canMerge = b;
  }

  function setTokenAddress(address tokenAddress) public onlyOwner {
    token = IERC20(tokenAddress);
  }

  function setNFTAddress(address nftAddress) public onlyOwner {
    nft = INFTStaker(nftAddress);
  }

  function setBaseURI(string memory uri) public onlyOwner {
    _setBaseURI(uri);
  }

  function setContractURI(string memory uri) public onlyOwner {
    _contractURI = uri;
  }

  function moveTokens(address tokenAddress, address to, uint256 numTokens) public onlyOwner {
    IERC20 _token = IERC20(tokenAddress);
    _token.safeTransfer(to, numTokens);
  }

  function contractURI() public view returns (string memory) {
    return _contractURI;
  }

  function getTotalMons() public view returns (uint256) {
    return _rewardIds.current();
  }
}
