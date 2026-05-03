// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IDecisionLog {
    function record(uint8 action, uint8 confidence, string calldata reasoning, uint256 metaParam1, uint256 metaParam2) external returns (uint256);
}

interface ITournamentVault {
    function openRound(uint8 aiAllocMeth, uint256 startMethPrice, uint256 startUsdyPrice) external returns (uint256);
    function settleRound(uint256 roundId, uint256 settleMethPrice, uint256 settleUsdyPrice, uint8 humanAllocMeth) external;
}

/// @title MensaAgent
/// @notice The autonomous treasury agent. Holds user-deposited mETH/USDY and
///         executes allocation strategies decided by the off-chain AI loop.
/// @dev Each public action emits to DecisionLog. Strategy execution requires
///      AI approval (signed off-chain) plus owner-set risk caps.
contract MensaAgent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable mETH;
    IERC20 public immutable USDY;
    IDecisionLog public decisionLog;
    ITournamentVault public tournamentVault;

    address public aiOperator;  // Off-chain AI executor address (allowed to call execute*)

    uint256 public maxAllocationBps = 9500;  // 95% max in single asset
    uint256 public minRebalanceBps = 200;    // Don't rebalance for <2% delta

    uint8 public currentMethAllocPct;        // 0-100 current target allocation

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event Rebalance(uint8 fromMeth, uint8 toMeth, uint256 decisionId);
    event AIOperatorChanged(address indexed newOperator);

    error OnlyAI();
    error InvalidAlloc();
    error AllocChangeTooSmall();

    modifier onlyAI() {
        if (msg.sender != aiOperator && msg.sender != owner()) revert OnlyAI();
        _;
    }

    constructor(address _mETH, address _USDY, address _aiOperator) Ownable(msg.sender) {
        mETH = IERC20(_mETH);
        USDY = IERC20(_USDY);
        aiOperator = _aiOperator;
        currentMethAllocPct = 50; // start 50/50
    }

    /// @notice User deposits mETH or USDY into the agent treasury
    function deposit(address asset, uint256 amount) external nonReentrant {
        require(asset == address(mETH) || asset == address(USDY), "unsupported asset");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        emit Deposit(msg.sender, asset, amount);
    }

    /// @notice User withdraws their share (simplified — production would use shares)
    function withdraw(address asset, uint256 amount) external nonReentrant {
        require(asset == address(mETH) || asset == address(USDY), "unsupported asset");
        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, asset, amount);
    }

    /// @notice AI sets a new target allocation. Triggers rebalance + decision log + tournament round.
    /// @param newMethAllocPct Target mETH allocation 0-100
    /// @param confidence AI confidence 0-100
    /// @param reasoning Natural language explanation
    /// @param methPrice Current mETH/USD price (8 decimals)
    /// @param usdyPrice Current USDY/USD price (8 decimals)
    function executeAllocation(
        uint8 newMethAllocPct,
        uint8 confidence,
        string calldata reasoning,
        uint256 methPrice,
        uint256 usdyPrice
    ) external onlyAI returns (uint256 decisionId, uint256 roundId) {
        if (newMethAllocPct > 100) revert InvalidAlloc();
        if (uint256(newMethAllocPct) * 100 > maxAllocationBps) revert InvalidAlloc();

        uint8 oldAlloc = currentMethAllocPct;
        uint256 delta = newMethAllocPct > oldAlloc
            ? uint256(newMethAllocPct - oldAlloc)
            : uint256(oldAlloc - newMethAllocPct);
        if (delta * 100 < minRebalanceBps) revert AllocChangeTooSmall();

        currentMethAllocPct = newMethAllocPct;

        // Log decision (action=REBALANCE=0)
        decisionId = decisionLog.record(0, confidence, reasoning, newMethAllocPct, 0);

        // Open new tournament round
        if (address(tournamentVault) != address(0)) {
            roundId = tournamentVault.openRound(newMethAllocPct, methPrice, usdyPrice);
        }

        emit Rebalance(oldAlloc, newMethAllocPct, decisionId);
    }

    // === Admin ===

    function setDecisionLog(address _log) external onlyOwner {
        decisionLog = IDecisionLog(_log);
    }

    function setTournamentVault(address _vault) external onlyOwner {
        tournamentVault = ITournamentVault(_vault);
    }

    function setAIOperator(address _operator) external onlyOwner {
        aiOperator = _operator;
        emit AIOperatorChanged(_operator);
    }

    function setRiskCaps(uint256 _maxAllocBps, uint256 _minRebalanceBps) external onlyOwner {
        require(_maxAllocBps <= 10000, "cap > 100%");
        maxAllocationBps = _maxAllocBps;
        minRebalanceBps = _minRebalanceBps;
    }
}
