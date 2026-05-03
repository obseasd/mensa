// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/MensaAgent.sol";
import "../src/DecisionLog.sol";
import "../src/TournamentVault.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory n, string memory s) ERC20(n, s) {
        _mint(msg.sender, 1_000_000 ether);
    }
}

contract MensaAgentTest is Test {
    MensaAgent agent;
    DecisionLog decisionLog;
    TournamentVault vault;
    MockERC20 mETH;
    MockERC20 USDY;

    address deployer = address(this);
    address aiOp = address(0xA1);
    address user = address(0xB1);

    function setUp() public {
        mETH = new MockERC20("Mantle ETH", "mETH");
        USDY = new MockERC20("Ondo USDY", "USDY");

        agent = new MensaAgent(address(mETH), address(USDY), aiOp);
        decisionLog = new DecisionLog(address(agent));
        vault = new TournamentVault(address(agent), address(mETH), address(USDY));

        agent.setDecisionLog(address(decisionLog));
        agent.setTournamentVault(address(vault));

        // Allow AI operator to settle tournament rounds directly
        vm.prank(address(agent));
        vault.setSettler(aiOp);

        mETH.transfer(user, 100 ether);
        USDY.transfer(user, 100 ether);
    }

    function test_initialAllocation() public view {
        assertEq(agent.currentMethAllocPct(), 50);
        assertEq(agent.aiOperator(), aiOp);
    }

    function test_userDeposit() public {
        vm.startPrank(user);
        mETH.approve(address(agent), 10 ether);
        agent.deposit(address(mETH), 10 ether);
        vm.stopPrank();
        assertEq(mETH.balanceOf(address(agent)), 10 ether);
    }

    function test_aiCanRebalance() public {
        vm.prank(aiOp);
        (uint256 decisionId, uint256 roundId) = agent.executeAllocation(
            70, 85, "USDY yield dropped, increasing mETH", 2500e8, 1e8
        );
        assertGt(decisionId, 0);
        assertGt(roundId, 0);
        assertEq(agent.currentMethAllocPct(), 70);
    }

    function test_nonAICannotRebalance() public {
        vm.prank(user);
        vm.expectRevert(MensaAgent.OnlyAI.selector);
        agent.executeAllocation(70, 85, "test", 2500e8, 1e8);
    }

    function test_decisionLoggedOnChain() public {
        vm.prank(aiOp);
        agent.executeAllocation(60, 90, "Yield analysis", 2500e8, 1e8);

        DecisionLog.Decision memory d = decisionLog.getDecision(1);
        assertEq(d.confidence, 90);
        assertEq(d.metaParam1, 60);
        assertEq(uint8(d.action), 0); // REBALANCE
    }

    function test_tournamentRoundOpened() public {
        vm.prank(aiOp);
        agent.executeAllocation(70, 85, "test", 2500e8, 1e8);
        // Read via getRoundView helper to avoid stack-too-deep
        TournamentVault.Round memory r = _getRound(1);
        assertEq(r.aiAllocMeth, 70);
        assertGt(r.settlementTime, block.timestamp);
    }

    function _getRound(uint256 id) internal view returns (TournamentVault.Round memory r) {
        (
            r.id,
            r.startTime,
            r.settlementTime,
            r.startMethPrice,
            r.startUsdyPrice,
            r.settleMethPrice,
            r.settleUsdyPrice,
            r.aiAllocMeth,
            r.humanAllocMeth,
            r.aiReturnBps,
            r.humanReturnBps,
            r.outcome,
            r.settled
        ) = vault.rounds(id);
    }

    function test_humanCanVote() public {
        vm.prank(aiOp);
        agent.executeAllocation(70, 85, "test", 2500e8, 1e8);

        vm.prank(user);
        vault.voteHuman(1, 50);
        assertEq(vault.humanVotes(1, user), 50);
    }

    function test_settleRoundAIWins() public {
        vm.prank(aiOp);
        agent.executeAllocation(80, 85, "high mETH conviction", 2500e8, 1e8);

        // mETH goes up 10%, USDY flat
        skip(2 days);
        vm.prank(aiOp);
        vault.settleRound(1, 2750e8, 1e8, 30); // human had 30% mETH

        TournamentVault.Round memory r = _getRound(1);
        assertEq(r.humanAllocMeth, 30);
        assertGt(r.aiReturnBps, r.humanReturnBps);
        assertEq(vault.aiWins(), 1);
    }

    function test_minRebalanceCheck() public {
        vm.prank(aiOp);
        vm.expectRevert(MensaAgent.AllocChangeTooSmall.selector);
        agent.executeAllocation(51, 85, "tiny change", 2500e8, 1e8); // delta = 1, threshold = 2
    }

    function test_maxAllocationCap() public {
        vm.prank(aiOp);
        vm.expectRevert(MensaAgent.InvalidAlloc.selector);
        agent.executeAllocation(96, 85, "too much", 2500e8, 1e8); // > 95%
    }
}
