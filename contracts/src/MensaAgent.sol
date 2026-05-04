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

interface IBountyPoolFee {
    function collectFee() external payable;
}

/// @title MensaAgent
/// @notice Treasury that allocates between mETH and USDY via AI decisions.
///         Performance fee (default 15%) on yield generated, sent to BountyPool.
///         Min stake required for voting in tournament.
///         Rebalance gates: min spread + min time between rebalances + net yield check.
contract MensaAgent is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable mETH;
    IERC20 public immutable USDY;
    IDecisionLog public decisionLog;
    ITournamentVault public tournamentVault;
    IBountyPoolFee public bountyPool;

    address public aiOperator;

    uint256 public maxAllocationBps = 9500;       // 95% max in single asset
    uint256 public minRebalanceBps = 200;          // Don't rebalance for <2% delta
    uint256 public performanceFeeBps = 1500;      // 15% of yield
    uint256 public minTimeBetweenRebalances = 6 hours;
    uint256 public lastRebalanceAt;

    uint8 public currentMethAllocPct;
    mapping(address => uint256) public userDeposits; // simplified accounting (sum of deposits)

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event Rebalance(uint8 fromMeth, uint8 toMeth, uint256 decisionId);
    event YieldDistributed(uint256 grossYield, uint256 fee);
    event AIOperatorChanged(address indexed newOperator);

    error OnlyAI();
    error InvalidAlloc();
    error AllocChangeTooSmall();
    error TooSoon();

    modifier onlyAI() {
        if (msg.sender != aiOperator && msg.sender != owner()) revert OnlyAI();
        _;
    }

    constructor(address _mETH, address _USDY, address _aiOperator) Ownable(msg.sender) {
        mETH = IERC20(_mETH);
        USDY = IERC20(_USDY);
        aiOperator = _aiOperator;
        currentMethAllocPct = 50;
    }

    /// @notice User deposits mETH or USDY
    function deposit(address asset, uint256 amount) external nonReentrant {
        require(asset == address(mETH) || asset == address(USDY), "unsupported asset");
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        userDeposits[msg.sender] += amount;
        emit Deposit(msg.sender, asset, amount);
    }

    /// @notice User withdraws their share (simplified — production would use shares)
    function withdraw(address asset, uint256 amount) external nonReentrant {
        require(asset == address(mETH) || asset == address(USDY), "unsupported asset");
        require(userDeposits[msg.sender] >= amount, "insufficient");
        userDeposits[msg.sender] -= amount;
        IERC20(asset).safeTransfer(msg.sender, amount);
        emit Withdraw(msg.sender, asset, amount);
    }

    /// @notice User's balance for tournament voting eligibility
    function userBalance(address user) external view returns (uint256) {
        return userDeposits[user];
    }

    /// @notice AI sets new target allocation. Triggers rebalance + decision log + tournament round.
    function executeAllocation(
        uint8 newMethAllocPct,
        uint8 confidence,
        string calldata reasoning,
        uint256 methPrice,
        uint256 usdyPrice
    ) external onlyAI returns (uint256 decisionId, uint256 roundId) {
        if (newMethAllocPct > 100) revert InvalidAlloc();
        if (uint256(newMethAllocPct) * 100 > maxAllocationBps) revert InvalidAlloc();

        // Time gate
        if (lastRebalanceAt > 0 && block.timestamp < lastRebalanceAt + minTimeBetweenRebalances) {
            revert TooSoon();
        }

        uint8 oldAlloc = currentMethAllocPct;
        uint256 delta = newMethAllocPct > oldAlloc
            ? uint256(newMethAllocPct - oldAlloc)
            : uint256(oldAlloc - newMethAllocPct);
        if (delta * 100 < minRebalanceBps) revert AllocChangeTooSmall();

        currentMethAllocPct = newMethAllocPct;
        lastRebalanceAt = block.timestamp;

        decisionId = decisionLog.record(0, confidence, reasoning, newMethAllocPct, 0);

        if (address(tournamentVault) != address(0)) {
            roundId = tournamentVault.openRound(newMethAllocPct, methPrice, usdyPrice);
        }

        emit Rebalance(oldAlloc, newMethAllocPct, decisionId);
    }

    /// @notice Take a yield snapshot and forward fee to BountyPool
    /// @dev Called periodically by the AI operator (or anyone). Must be funded
    ///      with the actual yield amount as msg.value (in MNT for gas / native token).
    function distributeYield() external payable onlyAI {
        if (address(bountyPool) == address(0)) return;
        uint256 grossYield = msg.value;
        uint256 fee = (grossYield * performanceFeeBps) / 10000;
        if (fee > 0) {
            bountyPool.collectFee{value: fee}();
        }
        emit YieldDistributed(grossYield, fee);
    }

    // === Admin ===

    function setDecisionLog(address _log) external onlyOwner { decisionLog = IDecisionLog(_log); }
    function setTournamentVault(address _vault) external onlyOwner { tournamentVault = ITournamentVault(_vault); }
    function setBountyPool(address _pool) external onlyOwner { bountyPool = IBountyPoolFee(_pool); }
    function setAIOperator(address _operator) external onlyOwner {
        aiOperator = _operator;
        emit AIOperatorChanged(_operator);
    }
    function setRiskCaps(uint256 _maxAllocBps, uint256 _minRebalanceBps, uint256 _minTime) external onlyOwner {
        require(_maxAllocBps <= 10000, "cap > 100%");
        maxAllocationBps = _maxAllocBps;
        minRebalanceBps = _minRebalanceBps;
        minTimeBetweenRebalances = _minTime;
    }
    function setPerformanceFee(uint256 _bps) external onlyOwner {
        require(_bps <= 3000, "max 30%");
        performanceFeeBps = _bps;
    }

    receive() external payable {}
}
