// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TournamentVault
/// @notice The "Turing Test" mechanic: AI vs Human compete on identical inputs.
/// @dev Each round opens with a snapshot of allocations. Both AI and Human
///      submit their target allocation between mETH and USDY. After settlement
///      delay, performance is computed and the winner is recorded on-chain.
contract TournamentVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome { PENDING, AI_WINS, HUMAN_WINS, TIE }

    struct Round {
        uint256 id;
        uint64 startTime;
        uint64 settlementTime;
        uint256 startMethPrice;
        uint256 startUsdyPrice;
        uint256 settleMethPrice;
        uint256 settleUsdyPrice;
        uint8 aiAllocMeth;       // 0-100, AI proposed mETH allocation
        uint8 humanAllocMeth;    // 0-100, Human proposed mETH allocation
        int256 aiReturnBps;      // basis points return (negative possible)
        int256 humanReturnBps;
        Outcome outcome;
        bool settled;
    }

    address public immutable agent;
    address public settler;        // Address allowed to settle rounds (initially same as agent's AI operator)
    address public immutable mETH;
    address public immutable USDY;

    uint256 public roundDuration = 1 days;
    uint256 public totalRounds;
    uint256 public aiWins;
    uint256 public humanWins;
    uint256 public ties;

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => uint8)) public humanVotes; // round => human => allocMeth

    event RoundOpened(uint256 indexed id, uint64 startTime, uint64 settlementTime);
    event AIAllocationSet(uint256 indexed id, uint8 allocMeth);
    event HumanVote(uint256 indexed id, address indexed human, uint8 allocMeth);
    event RoundSettled(uint256 indexed id, int256 aiReturnBps, int256 humanReturnBps, Outcome outcome);

    error OnlyAgent();
    error OnlySettler();
    error RoundNotFound();
    error RoundAlreadySettled();
    error RoundNotReadyToSettle();
    error InvalidAllocation();
    error AlreadyVoted();

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    modifier onlySettler() {
        if (msg.sender != settler && msg.sender != agent) revert OnlySettler();
        _;
    }

    constructor(address _agent, address _mETH, address _USDY) {
        agent = _agent;
        settler = _agent;
        mETH = _mETH;
        USDY = _USDY;
    }

    function setSettler(address _settler) external onlyAgent {
        settler = _settler;
    }

    /// @notice Open a new round with the current AI allocation proposal
    /// @param aiAllocMeth AI's proposed mETH percentage (0-100)
    /// @param startMethPrice Current mETH/USD price (8 decimals)
    /// @param startUsdyPrice Current USDY/USD price (8 decimals)
    function openRound(uint8 aiAllocMeth, uint256 startMethPrice, uint256 startUsdyPrice)
        external
        onlyAgent
        returns (uint256 id)
    {
        if (aiAllocMeth > 100) revert InvalidAllocation();
        id = ++totalRounds;
        rounds[id] = Round({
            id: id,
            startTime: uint64(block.timestamp),
            settlementTime: uint64(block.timestamp + roundDuration),
            startMethPrice: startMethPrice,
            startUsdyPrice: startUsdyPrice,
            settleMethPrice: 0,
            settleUsdyPrice: 0,
            aiAllocMeth: aiAllocMeth,
            humanAllocMeth: 0,
            aiReturnBps: 0,
            humanReturnBps: 0,
            outcome: Outcome.PENDING,
            settled: false
        });

        emit RoundOpened(id, uint64(block.timestamp), uint64(block.timestamp + roundDuration));
        emit AIAllocationSet(id, aiAllocMeth);
    }

    /// @notice Anyone can vote on the current round with their human allocation
    /// @dev One vote per address per round. Aggregated into median for settlement.
    function voteHuman(uint256 roundId, uint8 allocMeth) external {
        if (roundId == 0 || roundId > totalRounds) revert RoundNotFound();
        if (rounds[roundId].settled) revert RoundAlreadySettled();
        if (allocMeth > 100) revert InvalidAllocation();
        if (humanVotes[roundId][msg.sender] != 0) revert AlreadyVoted();

        humanVotes[roundId][msg.sender] = allocMeth == 0 ? 1 : allocMeth; // store 1 for "0" votes
        emit HumanVote(roundId, msg.sender, allocMeth);
    }

    /// @notice Settle a round: compute returns and record outcome
    /// @param roundId The round to settle
    /// @param settleMethPrice mETH price at settlement (8 decimals)
    /// @param settleUsdyPrice USDY price at settlement (8 decimals)
    /// @param humanAllocMeth Aggregated human allocation (e.g. median or admin-input)
    function settleRound(
        uint256 roundId,
        uint256 settleMethPrice,
        uint256 settleUsdyPrice,
        uint8 humanAllocMeth
    ) external onlySettler {
        Round storage r = rounds[roundId];
        if (r.id == 0) revert RoundNotFound();
        if (r.settled) revert RoundAlreadySettled();
        if (block.timestamp < r.settlementTime) revert RoundNotReadyToSettle();

        r.settleMethPrice = settleMethPrice;
        r.settleUsdyPrice = settleUsdyPrice;
        r.humanAllocMeth = humanAllocMeth;

        // Returns in basis points: ((settle/start) - 1) * 10000
        int256 methReturnBps = int256((settleMethPrice * 10000) / r.startMethPrice) - 10000;
        int256 usdyReturnBps = int256((settleUsdyPrice * 10000) / r.startUsdyPrice) - 10000;

        r.aiReturnBps =
            (int256(uint256(r.aiAllocMeth)) * methReturnBps + int256(uint256(100 - r.aiAllocMeth)) * usdyReturnBps) / 100;
        r.humanReturnBps =
            (int256(uint256(humanAllocMeth)) * methReturnBps + int256(uint256(100 - humanAllocMeth)) * usdyReturnBps) / 100;

        if (r.aiReturnBps > r.humanReturnBps) {
            r.outcome = Outcome.AI_WINS;
            aiWins++;
        } else if (r.humanReturnBps > r.aiReturnBps) {
            r.outcome = Outcome.HUMAN_WINS;
            humanWins++;
        } else {
            r.outcome = Outcome.TIE;
            ties++;
        }

        r.settled = true;
        emit RoundSettled(roundId, r.aiReturnBps, r.humanReturnBps, r.outcome);
    }

    function aiWinRateBps() external view returns (uint256) {
        if (totalRounds == 0) return 0;
        return (aiWins * 10000) / totalRounds;
    }
}
