// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IReputation {
    function update(address user, bool won, int256 outperformanceBps) external;
    function getWeight(address user) external view returns (uint256);
}

interface IBountyPool {
    function distributeRound(uint256 roundId, address[] calldata winners, uint256[] calldata sharesBps) external;
}

interface IBadges {
    enum BadgeType { FIRST_VOTE, BEAT_AI_10X, BEAT_AI_100X, STREAK_5, REPUTATION_500, REPUTATION_1000, TOP_10_MONTHLY }
    function mint(address to, BadgeType bt) external returns (uint256);
    function hasBadge(address user, BadgeType bt) external view returns (bool);
}

interface IMensaAgent {
    function userBalance(address user) external view returns (uint256);
}

/// @title TournamentVault
/// @notice The Turing Test mechanic: AI vs Human compete on identical inputs.
///         Each round opens with the AI's allocation snapshot. Humans vote
///         their own allocation (must have minimum stake). After settlement,
///         performance is computed on-chain, winners get bounty + reputation.
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
        uint8 aiAllocMeth;
        uint8 humanAllocMeth;       // aggregated (median or weighted)
        int256 aiReturnBps;
        int256 humanReturnBps;
        Outcome outcome;
        bool settled;
    }

    struct Vote {
        uint8 allocMeth;
        uint256 weight;          // sqrt(stake × reputation) at vote time
        uint256 timestamp;
    }

    address public immutable agent;
    address public settler;
    address public immutable mETH;
    address public immutable USDY;

    IReputation public reputation;
    IBountyPool public bountyPool;
    IBadges public badges;

    uint256 public roundDuration;
    uint256 public minVotingStakeWei;     // min user balance in agent to vote
    uint256 public totalRounds;
    uint256 public aiWins;
    uint256 public humanWins;
    uint256 public ties;

    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => address[]) public roundVoters;

    event RoundOpened(uint256 indexed id, uint64 startTime, uint64 settlementTime);
    event AIAllocationSet(uint256 indexed id, uint8 allocMeth);
    event HumanVote(uint256 indexed id, address indexed human, uint8 allocMeth, uint256 weight);
    event RoundSettled(uint256 indexed id, int256 aiReturnBps, int256 humanReturnBps, Outcome outcome);
    event WinnersRewarded(uint256 indexed id, uint256 numWinners);

    error OnlyAgent();
    error OnlySettler();
    error RoundNotFound();
    error RoundAlreadySettled();
    error RoundNotReadyToSettle();
    error InvalidAllocation();
    error AlreadyVoted();
    error InsufficientStake();

    modifier onlyAgent() { if (msg.sender != agent) revert OnlyAgent(); _; }
    modifier onlySettler() { if (msg.sender != settler && msg.sender != agent) revert OnlySettler(); _; }

    constructor(
        address _agent,
        address _mETH,
        address _USDY,
        address _settler,
        uint256 _roundDuration
    ) {
        agent = _agent;
        settler = _settler == address(0) ? _agent : _settler;
        mETH = _mETH;
        USDY = _USDY;
        roundDuration = _roundDuration;
    }

    // === Admin wiring ===

    function setReputation(address _rep) external onlyAgent {
        reputation = IReputation(_rep);
    }
    function setBountyPool(address _pool) external onlyAgent {
        bountyPool = IBountyPool(_pool);
    }
    function setBadges(address _badges) external onlyAgent {
        badges = IBadges(_badges);
    }
    function setMinVotingStake(uint256 amount) external onlyAgent {
        minVotingStakeWei = amount;
    }
    function setSettler(address _settler) external onlyAgent {
        settler = _settler;
    }

    // === Round lifecycle ===

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

    /// @notice Vote your human allocation. Requires min stake in MensaAgent.
    function voteHuman(uint256 roundId, uint8 allocMeth) external {
        if (roundId == 0 || roundId > totalRounds) revert RoundNotFound();
        Round storage r = rounds[roundId];
        if (r.settled) revert RoundAlreadySettled();
        if (allocMeth > 100) revert InvalidAllocation();
        if (votes[roundId][msg.sender].timestamp != 0) revert AlreadyVoted();

        // Check min stake (skip if minVotingStakeWei is 0)
        if (minVotingStakeWei > 0) {
            uint256 stake = IMensaAgent(agent).userBalance(msg.sender);
            if (stake < minVotingStakeWei) revert InsufficientStake();
        }

        // Weight = sqrt(reputation) — caller's stake is already a gate
        uint256 weight = address(reputation) != address(0)
            ? reputation.getWeight(msg.sender)
            : 1;

        votes[roundId][msg.sender] = Vote({
            allocMeth: allocMeth,
            weight: weight,
            timestamp: block.timestamp
        });
        roundVoters[roundId].push(msg.sender);

        // Mint FIRST_VOTE badge
        if (address(badges) != address(0) && !badges.hasBadge(msg.sender, IBadges.BadgeType.FIRST_VOTE)) {
            try badges.mint(msg.sender, IBadges.BadgeType.FIRST_VOTE) {} catch {}
        }

        emit HumanVote(roundId, msg.sender, allocMeth, weight);
    }

    /// @notice Settle a round and distribute rewards to winners
    function settleRound(
        uint256 roundId,
        uint256 settleMethPrice,
        uint256 settleUsdyPrice,
        uint8 aggregateHumanAlloc
    ) external onlySettler {
        Round storage r = rounds[roundId];
        if (r.id == 0) revert RoundNotFound();
        if (r.settled) revert RoundAlreadySettled();
        if (block.timestamp < r.settlementTime) revert RoundNotReadyToSettle();

        r.settleMethPrice = settleMethPrice;
        r.settleUsdyPrice = settleUsdyPrice;
        r.humanAllocMeth = aggregateHumanAlloc;

        int256 methReturn = int256((settleMethPrice * 10000) / r.startMethPrice) - 10000;
        int256 usdyReturn = int256((settleUsdyPrice * 10000) / r.startUsdyPrice) - 10000;

        r.aiReturnBps = (int256(uint256(r.aiAllocMeth)) * methReturn + int256(uint256(100 - r.aiAllocMeth)) * usdyReturn) / 100;
        r.humanReturnBps = (int256(uint256(aggregateHumanAlloc)) * methReturn + int256(uint256(100 - aggregateHumanAlloc)) * usdyReturn) / 100;

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

        _rewardWinners(roundId);
    }

    /// @notice Internal: compute winners, update reputation, distribute bounty
    function _rewardWinners(uint256 roundId) internal {
        Round memory r = rounds[roundId];
        address[] memory voters = roundVoters[roundId];
        if (voters.length == 0) return;

        // First pass: compute return for each voter, find total outperformance
        int256[] memory voterReturns = new int256[](voters.length);
        bool[] memory voterWon = new bool[](voters.length);
        uint256 totalOutperformanceWeight = 0;
        int256 methReturn = int256((r.settleMethPrice * 10000) / r.startMethPrice) - 10000;
        int256 usdyReturn = int256((r.settleUsdyPrice * 10000) / r.startUsdyPrice) - 10000;

        uint256 winnerCount = 0;
        for (uint256 i = 0; i < voters.length; i++) {
            Vote memory v = votes[roundId][voters[i]];
            int256 ret = (int256(uint256(v.allocMeth)) * methReturn + int256(uint256(100 - v.allocMeth)) * usdyReturn) / 100;
            voterReturns[i] = ret;
            int256 outperformance = ret - r.aiReturnBps;
            if (outperformance > 0) {
                voterWon[i] = true;
                winnerCount++;
                // Weighted outperformance: outperformance × sqrt(weight)
                totalOutperformanceWeight += uint256(outperformance) * v.weight;
            }
            // Update reputation either way
            if (address(reputation) != address(0)) {
                try reputation.update(voters[i], outperformance > 0, outperformance) {} catch {}
            }
        }

        // Second pass: build winners list + shares
        if (winnerCount > 0 && address(bountyPool) != address(0) && totalOutperformanceWeight > 0) {
            address[] memory winners = new address[](winnerCount);
            uint256[] memory shares = new uint256[](winnerCount);
            uint256 idx = 0;
            for (uint256 i = 0; i < voters.length; i++) {
                if (voterWon[i]) {
                    Vote memory v = votes[roundId][voters[i]];
                    int256 outperf = voterReturns[i] - r.aiReturnBps;
                    uint256 weighted = uint256(outperf) * v.weight;
                    winners[idx] = voters[i];
                    shares[idx] = (weighted * 10000) / totalOutperformanceWeight;
                    idx++;
                }
            }
            try bountyPool.distributeRound(roundId, winners, shares) {} catch {}
            emit WinnersRewarded(roundId, winnerCount);
        }
    }

    function aiWinRateBps() external view returns (uint256) {
        if (totalRounds == 0) return 0;
        return (aiWins * 10000) / totalRounds;
    }

    function getVotersCount(uint256 roundId) external view returns (uint256) {
        return roundVoters[roundId].length;
    }
}
