// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title BountyPool
/// @notice Receives performance fees from MensaAgent (15% of yield generated).
///         Distributes to humans who beat the AI in tournament rounds.
///         Distribution is performance-weighted: better outperformance = bigger share.
///
/// Splits:
///   50% Round winners pool — distributed to humans who beat AI in each round
///   30% Reputation pool    — monthly top-N voters by reputation
///   20% Operations         — protocol funding
contract BountyPool is ReentrancyGuard {
    address public immutable agent;
    address public tournament;
    address public owner;

    uint256 public constant WINNER_BPS = 5000;   // 50%
    uint256 public constant REP_BPS = 3000;       // 30%
    uint256 public constant OPS_BPS = 2000;       // 20%

    uint256 public totalCollected;
    uint256 public totalDistributed;
    uint256 public winnerPoolBalance;
    uint256 public reputationPoolBalance;
    uint256 public opsPoolBalance;

    mapping(address => uint256) public claimable;
    mapping(uint256 => bool) public roundDistributed;

    event FeeCollected(uint256 amount);
    event RoundDistributed(uint256 indexed roundId, uint256 totalReward, uint256 numWinners);
    event Claimed(address indexed user, uint256 amount);

    error OnlyAgent();
    error OnlyTournament();
    error OnlyOwner();
    error AlreadyDistributed();
    error NoRewards();
    error TransferFailed();
    error LengthMismatch();

    modifier onlyAgent() { if (msg.sender != agent) revert OnlyAgent(); _; }
    modifier onlyTournament() { if (msg.sender != tournament) revert OnlyTournament(); _; }
    modifier onlyOwner() { if (msg.sender != owner) revert OnlyOwner(); _; }

    constructor(address _agent) {
        agent = _agent;
        owner = msg.sender;
    }

    function setTournament(address _tournament) external onlyOwner {
        tournament = _tournament;
    }

    /// @notice Receive performance fee (15% of yield) from MensaAgent
    /// @dev Splits incoming fee into 3 buckets per the constants above
    function collectFee() external payable onlyAgent {
        uint256 amount = msg.value;
        totalCollected += amount;

        winnerPoolBalance += (amount * WINNER_BPS) / 10000;
        reputationPoolBalance += (amount * REP_BPS) / 10000;
        opsPoolBalance += (amount * OPS_BPS) / 10000;

        emit FeeCollected(amount);
    }

    /// @notice Tournament calls this after settling a round, with the list of
    ///         winners and their pre-computed shares (in bps of round pool)
    /// @param roundId The settled round
    /// @param winners Array of winner addresses
    /// @param sharesBps Array of share percentages in basis points (sum should equal 10000)
    function distributeRound(
        uint256 roundId,
        address[] calldata winners,
        uint256[] calldata sharesBps
    ) external onlyTournament {
        if (roundDistributed[roundId]) revert AlreadyDistributed();
        if (winners.length != sharesBps.length) revert LengthMismatch();
        if (winners.length == 0) {
            roundDistributed[roundId] = true;
            return;
        }

        // Allocate up to 1% of winnerPoolBalance per round (so pool depletes slowly)
        uint256 roundPool = winnerPoolBalance / 100;
        if (roundPool == 0) {
            roundDistributed[roundId] = true;
            return;
        }

        winnerPoolBalance -= roundPool;
        roundDistributed[roundId] = true;

        for (uint256 i = 0; i < winners.length; i++) {
            uint256 reward = (roundPool * sharesBps[i]) / 10000;
            claimable[winners[i]] += reward;
        }

        emit RoundDistributed(roundId, roundPool, winners.length);
    }

    /// @notice Distribute reputation pool to top voters monthly
    function distributeReputationRewards(
        address[] calldata topVoters,
        uint256[] calldata sharesBps
    ) external onlyOwner {
        if (topVoters.length != sharesBps.length) revert LengthMismatch();
        uint256 monthPool = reputationPoolBalance / 12; // distribute ~1/12th
        if (monthPool == 0) return;

        reputationPoolBalance -= monthPool;
        for (uint256 i = 0; i < topVoters.length; i++) {
            uint256 reward = (monthPool * sharesBps[i]) / 10000;
            claimable[topVoters[i]] += reward;
        }
    }

    /// @notice Claim accumulated rewards
    function claim() external nonReentrant {
        uint256 amount = claimable[msg.sender];
        if (amount == 0) revert NoRewards();
        claimable[msg.sender] = 0;
        totalDistributed += amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit Claimed(msg.sender, amount);
    }

    /// @notice Owner can withdraw ops pool
    function withdrawOps(address to, uint256 amount) external onlyOwner {
        require(amount <= opsPoolBalance, "exceeds ops pool");
        opsPoolBalance -= amount;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    receive() external payable {
        totalCollected += msg.value;
    }
}
