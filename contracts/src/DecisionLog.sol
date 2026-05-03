// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title DecisionLog
/// @notice Permanent on-chain record of every Mensa agent decision.
/// @dev Each decision contains its reasoning hash + actual action taken.
///      Built for Mantle's low-gas environment — every decision is logged.
contract DecisionLog {
    enum ActionType { REBALANCE, STAKE, UNSTAKE, DEPOSIT, WITHDRAW, HOLD }

    struct Decision {
        uint256 id;
        uint64 timestamp;
        uint8 confidence;       // 0-100
        ActionType action;
        bytes32 reasoningHash;  // hash of the natural-language reasoning (stored off-chain or in event data)
        uint256 metaParam1;     // e.g. allocation %
        uint256 metaParam2;     // e.g. amount
    }

    address public immutable agent;
    uint256 public totalDecisions;
    mapping(uint256 => Decision) public decisions;

    event DecisionRecorded(
        uint256 indexed id,
        uint64 timestamp,
        ActionType action,
        uint8 confidence,
        bytes32 reasoningHash,
        string reasoning
    );

    error OnlyAgent();

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    constructor(address _agent) {
        agent = _agent;
    }

    /// @notice Log a new agent decision on-chain
    /// @param action The type of action taken
    /// @param confidence Agent confidence 0-100
    /// @param reasoning Natural language reasoning (emitted in event for indexers)
    /// @param metaParam1 Action-specific parameter (e.g. target allocation %)
    /// @param metaParam2 Action-specific parameter (e.g. amount)
    function record(
        ActionType action,
        uint8 confidence,
        string calldata reasoning,
        uint256 metaParam1,
        uint256 metaParam2
    ) external onlyAgent returns (uint256 id) {
        id = ++totalDecisions;
        bytes32 hash = keccak256(abi.encodePacked(reasoning));

        decisions[id] = Decision({
            id: id,
            timestamp: uint64(block.timestamp),
            confidence: confidence,
            action: action,
            reasoningHash: hash,
            metaParam1: metaParam1,
            metaParam2: metaParam2
        });

        emit DecisionRecorded(id, uint64(block.timestamp), action, confidence, hash, reasoning);
    }

    /// @notice Fetch a decision by id
    function getDecision(uint256 id) external view returns (Decision memory) {
        return decisions[id];
    }

    /// @notice Get the latest N decisions (newest first)
    function getRecent(uint256 n) external view returns (Decision[] memory list) {
        uint256 total = totalDecisions;
        if (n > total) n = total;
        list = new Decision[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = decisions[total - i];
        }
    }
}
