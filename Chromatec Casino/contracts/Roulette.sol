// SPDX-License-Identifier: MIT
pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import "contracts/Chroma.sol";

contract Roulette is VRFConsumerBase {
    
    bytes32 internal keyHash;
    uint256 internal fee;
    address public casino;
    address public owner;
    uint256 public maxBet = 1 ether;
    uint256 public maxBetRatio = 100;

    event SpinComplete(uint256 ballNumber);
    event NewSpinDate(uint256 nextSpin);
    event BetsClosed();
    
    Chroma internal chroma;

    /*
    BetTypes are as follow:
      0: color
      1: column
      2: dozen
      3: eighteen
      4: modulus
      5: number
      
    Depending on the BetType, number will be:
      color: 0 for black, 1 for red
      column: 0 for left, 1 for middle, 2 for right
      dozen: 0 for first, 1 for second, 2 for third
      eighteen: 0 for low, 1 for high
      modulus: 0 for even, 1 for odd
      number: number
  */
    
    struct Bet {
        address payable player;
        uint8 bet_type;
        uint bet_num;
        uint amount;
        uint16 round_bet_id;
    }

    struct SimpleBet {
        uint8 bet_type;
        uint bet_num;
        uint amount;
	uint chroma_value;
    }
    
    mapping(address => uint256) public balance;
    mapping(uint16 => Bet) public book;
    mapping(address => uint256) public didWin;
   
    uint256 private lastSpin;
    uint256 private nextSpin = block.timestamp + 4 minutes;
    
    uint16 [] private round_bets;
    address[] lastWinners;
    
    uint8 [] private column1 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
    uint8 [] private column2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
    uint8 [] private column3 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
    
    uint8[] private red = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    uint8[] private black = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    
    mapping (uint => bool) private redNums;
    mapping (uint => bool) private blackNums;
    
    mapping (uint => bool) private col1Nums;
    mapping (uint => bool) private col2Nums;
    mapping (uint => bool) private col3Nums;


    function setReds(uint num) private {
        redNums[num]=true;
    }
    
    function setBlacks(uint num) private {
        blackNums[num]=true;
    }
    
    function setCol1(uint num) private {
        col1Nums[num]=true;
    }
    
    function setCol2(uint num) private {
        col2Nums[num]=true;
    }
    
    function setCol3(uint num) private {
        col3Nums[num]=true;
    }
    
    function fillRedMap()  private {
        for(uint i; i < red.length; i++) {
            setReds(red[i]);  
        }
    }
    
    function fillBlackMap()  private {
        for(uint i; i < black.length; i++) {
            setBlacks(black[i]);  
        }
    }
    
    function fillCol1Map()  private {
        for(uint i; i < column1.length; i++) {
            setCol1(column1[i]);  
        }
    }
    
    function fillCol2Map()  private {
        for(uint i; i < column2.length; i++) {
            setCol2(column2[i]);  
        }
    }
    
    function fillCol3Map()  private {
        for(uint i; i < column3.length; i++) {
            setCol3(column3[i]);  
        }
    }
    
    function current_bets() view private returns (uint16) {
        uint16 tmp = 0;
        for(uint16 i = 0; i < round_bets.length; i++) {
            if(book[round_bets[i]].amount > 0) {
                tmp++;
            }
        }
        return tmp;
    }

    
    uint256 private randomResult;
    
    /**
     * Constructor inherits VRFConsumerBase
     * 
     * Network: MATIC
     * Chainlink VRF Coordinator address: 0x8C7382F9D8f56b33781fE506E897a4F1e2d17255
     * LINK token address:                0x326C977E6efc84E512bB9C30f76E30c160eD06FB
     * Key Hash: 0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4
     */
    constructor(address _token) 
        VRFConsumerBase(
            0x8C7382F9D8f56b33781fE506E897a4F1e2d17255, // VRF Coordinator
            0x326C977E6efc84E512bB9C30f76E30c160eD06FB  // LINK Token
       ) public
    {   
        keyHash = 0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4;
        fee = 0.0001 * 10 ** 18; // 0.0001 LINK
        casino = address(this);
        owner = msg.sender;
        chroma = Chroma (_token);
        
        fillRedMap();
        fillBlackMap();
        fillCol1Map();
        fillCol2Map();
        fillCol3Map();
        
    }
    
    function isRed(uint bet_num) private view returns (bool) {
        return redNums[bet_num];
    }
    
    function isBlack(uint bet_num) private view returns (bool) {
        return blackNums[bet_num];
    }
    
    function isColumn1(uint bet_num) private view returns (bool) {
        return col1Nums[bet_num];
    }
    
    function isColumn2(uint bet_num) private view returns (bool) {
        return col2Nums[bet_num];
    }
    
    function isColumn3(uint bet_num) private view returns (bool) {
        return col3Nums[bet_num];
    }
    
    function maxBetValue () external view returns(uint256) {
        uint256 _maxBet = checkCasinoBalance() / maxBetRatio;
        return _maxBet;
    }

    function checkMaxBet (uint amount) public view {
        require(amount <= maxBet, "This bet exceed max possible bet");
    }

    modifier onlyCasino() {
        require(msg.sender == casino, "This can only be called by the contract itself.");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "This can only be called by the contract owner.");
        _;
    }
    
    function addBalance(uint256 amount) external {
        bool sent = chroma.transferFrom(msg.sender,casino,amount);
	    require(sent, "CHROMA transfer failed");
        balance[msg.sender] += amount;
        maxBet = checkCasinoBalance() / maxBetRatio;
    }

    function getNextSpin() external view returns (uint256) {
        return nextSpin;
    }

    function getLastSpin() external view returns (uint256) {
        return lastSpin;
    }
    
    function checkBalance() external view returns (uint256) {
        return balance[msg.sender];
    }
    
    function checkCasinoBalance() private view returns(uint256) {
        return chroma.balanceOf(casino);
    }

    function checkDidWin() external view returns(uint256){
        return didWin[msg.sender];
    }

    
    //in wei number
    function Withdraw(uint256 amount) external {
	    require(balance[msg.sender] >= amount);
	    balance[msg.sender] -= amount;
	    bool sent = chroma.transfer(msg.sender,amount);
	    require(sent, "CHROMA transfer failed");
	    maxBet = checkCasinoBalance() / maxBetRatio;
	}
	
	
    uint16 private _bet_id = 0;
    
    function betting(SimpleBet[] calldata bets) external {
        uint256 totalAmount=0;
        for(uint index=0; index<bets.length; index++){
            totalAmount += bets[index].amount;
        }

        checkMaxBet(totalAmount);

        require(balance[msg.sender] >= totalAmount);
        balance[owner] += totalAmount*2/100;
        balance[msg.sender] -= totalAmount;
        address payable bettor = msg.sender;

        for(uint index=0; index<bets.length; index++){        
            //store request id and address
            Bet memory cur_bet = Bet(bettor,bets[index].bet_type, bets[index].bet_num, bets[index].amount*98/100, _bet_id++);
            book[_bet_id] = cur_bet;
            round_bets.push(_bet_id);
        }
    }

    function upTime() external onlyOwner {
        nextSpin = block.timestamp + 1 minutes;
        emit NewSpinDate(nextSpin);
    }
    

    //spinWheel
    function spinWheel() external onlyOwner {
        for(uint i = 0; i < round_bets.length; i++) {
            Bet memory _curBet = book[round_bets[i]];
            address payable _bettor = _curBet.player;
            didWin[_bettor]=0;          
        }
        
        emit BetsClosed();
        //Request randomness, get request id
        bytes32 current_request;
        current_request = getRandomNumber();
    }
    

    /** 
     * Requests randomness from a user-provided seed
     */
    function getRandomNumber() private returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) > fee, "Not enough LINK - fill contract with faucet");
        return requestRandomness(keyHash, fee);
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        //delete lastWinners from memory
        delete lastWinners;
        lastSpin = nextSpin;
        
        randomResult = randomness;
        uint _spinResult = randomResult % 36;
        
        for(uint i = 0; i < round_bets.length; i++) {
            
            Bet memory _curBet = book[round_bets[i]];
            uint bet_type = _curBet.bet_type;
            uint _betNum = _curBet.bet_num;
            address payable _bettor = _curBet.player;
            uint _amount = _curBet.amount;

            //pay if they are a winner!
            if (_spinResult == _betNum && bet_type==5) {
                balance[_bettor] += _amount * 36;
                didWin[_bettor]=2;
                lastWinners.push(_bettor);
            } else if (_spinResult > 0 && _spinResult % 2 == _betNum && bet_type==4) {
                balance[_bettor] += _amount * 2;
                didWin[_bettor]=2;
                lastWinners.push(_bettor);
            } else if ((_spinResult < 19 && _spinResult > 0 && _betNum == 0 || _spinResult > 18 && _betNum > 18 && _spinResult < 37 && _betNum == 1) && bet_type==3) {
                balance[_bettor] += _amount * 2;
                didWin[_bettor]=2;
                lastWinners.push(_bettor);
            } else if ((_spinResult < 13 && _spinResult > 0 && _betNum == 0 || _spinResult > 12 && _spinResult < 25 && _betNum == 1 || _spinResult > 24 && _spinResult < 37 && _betNum == 2) && bet_type==2) {
                balance[_bettor] += _amount * 3;
                didWin[_bettor]=2;
                lastWinners.push(_bettor);
            } else if (_spinResult > 0 && (_betNum==0 && isColumn1(_spinResult) || _betNum==1 && isColumn2(_spinResult) || _betNum==2  && isColumn3(_spinResult)) && bet_type==1) {
                balance[_bettor] += _amount * 3;
                didWin[_bettor]=2;
                lastWinners.push(_bettor);
            } else if (_spinResult > 0 && (_betNum==0 && isBlack(_spinResult) || _betNum==1 && isRed(_spinResult)) && bet_type==0) {
                balance[_bettor] += _amount * 2;
                didWin[_bettor]=2;
                lastWinners.push(_bettor);
            } else {
                didWin[_bettor]=1;
            }

            maxBet = checkCasinoBalance() / maxBetRatio;            
        }

        delete round_bets;

        nextSpin = lastSpin + 2 minutes;

        emit SpinComplete(_spinResult);
        emit NewSpinDate(nextSpin);
    }
}