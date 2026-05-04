// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Reputation
/// @notice Tracks per-address reputation score based on tournament performance.
///         Higher score = more weight in vote aggregation + more bounty share.
///         Designed to resist Sybil: new wallets start at 100, must earn weight.
contract Reputation {
    address public immutable tournament;
    address public owner;

    // score is uint256 to allow accumulation. Default 100 for new accounts.
    mapping(address => uint256) private _score;
    mapping(address => bool) public hasParticipated;
    mapping(address => uint64) public firstParticipation;
    mapping(address => uint256) public correctVotes;
    mapping(address => uint256) public totalVotes;

    uint256 public constant INITIAL_SCORE = 100;
    uint256 public constant MAX_BOOST = 50;       // Max +50 per win
    uint256 public constant MAX_PENALTY = 25;     // Max -25 per loss

    event ReputationUpdated(address indexed user, uint256 newScore, bool won, int256 outperformanceBps);

    error OnlyTournament();

    constructor(address _tournament) {
        tournament = _tournament;
        owner = msg.sender;
    }

    modifier onlyTournament() {
        if (msg.sender != tournament) revert OnlyTournament();
        _;
    }

    /// @notice Score with default fallback
    function score(address user) public view returns (uint256) {
        if (!hasParticipated[user]) return INITIAL_SCORE;
        return _score[user];
    }

    /// @notice Vote weight = sqrt(score), prevents whales from dominating
    function getWeight(address user) external view returns (uint256) {
        return _sqrt(score(user));
    }

    /// @notice Called by Tournament after each settled round
    /// @param user The voter address
    /// @param won Whether they outperformed the AI
    /// @param outperformanceBps Their return minus AI's return, in basis points
    function update(address user, bool won, int256 outperformanceBps) external onlyTournament {
        if (!hasParticipated[user]) {
            hasParticipated[user] = true;
            firstParticipation[user] = uint64(block.timestamp);
            _score[user] = INITIAL_SCORE;
        }

        totalVotes[user]++;
        uint256 current = _score[user];

        if (won) {
            correctVotes[user]++;
            // Boost proportional to outperformance (capped)
            uint256 boost = uint256(outperformanceBps) / 4;  // 200 bps outperf = +50
            if (boost > MAX_BOOST) boost = MAX_BOOST;
            _score[user] = current + boost;
        } else {
            uint256 underperf = uint256(-outperformanceBps);
            uint256 penalty = underperf / 8;  // 200 bps under = -25
            if (penalty > MAX_PENALTY) penalty = MAX_PENALTY;
            // Floor at INITIAL_SCORE / 2 so user can recover
            uint256 floor_ = INITIAL_SCORE / 2;
            _score[user] = current > penalty + floor_ ? current - penalty : floor_;
        }

        emit ReputationUpdated(user, _score[user], won, outperformanceBps);
    }

    /// @notice Win rate as percentage (0-100)
    function winRate(address user) external view returns (uint256) {
        if (totalVotes[user] == 0) return 0;
        return (correctVotes[user] * 100) / totalVotes[user];
    }

    /// @notice Babylonian method for sqrt
    function _sqrt(uint256 x) private pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
