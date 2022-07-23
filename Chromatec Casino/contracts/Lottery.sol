// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.6;

import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import "contracts/Chroma.sol";

contract Lottery is VRFConsumerBase {

	mapping(address => uint256) public winnings;
	address payable [] public tickets;

	bytes32 internal keyHash;
	uint256 internal fee;

	Chroma public chroma;
	address public casino;
	address public owner;

	// -------------------- variables -----------------------------------------	
	string public name = "Lottery";

	uint256 public maxTickets = 100;
	uint256 public remainingTickets = 0;
	uint256 public ticketCount = 0;

	uint256 public lastSpin;
	uint256 public nextSpin = block.timestamp + 4 minutes;

	address public latestWinner;

	//wei
	uint256 public ticketPrice = 1000000000000000000000;

	uint256 private randomResult;

	event NewSpinDate(uint256 nextSpin);
	event AllTicketsBought();
	event SpinComplete(address userAddress);

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
		chroma = Chroma (_token);
		casino = address(this);
		owner = msg.sender;
		remainingTickets = maxTickets;
	}

	modifier onlyCasino() {
		require(msg.sender == casino, "This can only be called by the contract itself.");
		_;
	}

	modifier onlyOwner() {
		require(msg.sender == owner, "This can only be called by the contract owner.");
		_;
	}

	function setNumTickets(uint256 newMax) external onlyOwner {
		maxTickets = newMax;
	}

	function getPotAmount() public view returns (uint256)  {
		return ticketPrice * ticketCount * 95 / 100;
	}

	function buyTicket(uint256 amountOfTickets) external {

		require(amountOfTickets<=remainingTickets);

		if(ticketCount==0){
			nextSpin = block.timestamp + 2 minutes;
			emit NewSpinDate(nextSpin);
		}

		bool sent = chroma.transferFrom(msg.sender,casino,ticketPrice);
		require(sent, "CHROMA transfer failed");

		remainingTickets -= amountOfTickets; //remove from unspent supply

		for(uint i = 0; i<amountOfTickets; i++) {
			tickets.push(msg.sender);
			ticketCount++;
		}

		if(ticketCount==remainingTickets){
			requestPrivateRandomness();
			emit AllTicketsBought();
		}

	}

	function Withdraw() external {
		require(winnings[msg.sender] > 0);

		uint256 amountToWithdraw = winnings[msg.sender];

		bool sent = chroma.transfer(msg.sender,amountToWithdraw);
		require(sent, "CHROMA transfer failed");

		winnings[msg.sender] = 0;

	}

	function numTicketsBought() external view returns(uint256) {
		uint num = 0;
		for(uint i = 0; i<tickets.length; i++) {
			if(tickets[i] == msg.sender) {
				num++;
			}
		}
		return num;
	}

	function checkBalance() external view returns (uint256) {
		return winnings[msg.sender];
	}

	function upTime() external onlyOwner {
		nextSpin = block.timestamp + 1 minutes;
	}

	//spinWheel
	function requestRandomness() external onlyOwner {
		require(ticketCount > 0);
		//Request randomness, get request id
		bytes32 current_request;
		current_request = getRandomNumber();
	}

	//spinWheel
	function requestPrivateRandomness() private onlyOwner {
		require(ticketCount > 0);
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

		lastSpin = nextSpin;

		randomResult = randomness;
		uint _spinResult = randomResult % ticketCount;

		latestWinner = tickets[_spinResult];
		winnings[latestWinner] = winnings[latestWinner] + getPotAmount();
		ticketCount = 0;

		remainingTickets = maxTickets;

		delete tickets;
		
		emit SpinComplete(latestWinner);

	}

}