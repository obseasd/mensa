// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/BountyPool.sol";

contract BountyPoolTest is Test {
    BountyPool pool;
    address agent = address(0xA9);
    address tournament = address(0x70);
    address alice = address(0xA1);
    address bob = address(0xB0B);
    address payable ops = payable(address(0x999));

    function setUp() public {
        pool = new BountyPool(agent);
        pool.setTournament(tournament);
        // Give agent some funds for fee collection
        vm.deal(agent, 100 ether);
    }

    function test_collectFeeSplits() public {
        vm.prank(agent);
        pool.collectFee{value: 100 ether}();

        assertEq(pool.totalCollected(), 100 ether);
        assertEq(pool.winnerPoolBalance(), 50 ether); // 50%
        assertEq(pool.reputationPoolBalance(), 30 ether); // 30%
        assertEq(pool.opsPoolBalance(), 20 ether); // 20%
    }

    function test_onlyAgentCanCollect() public {
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert(BountyPool.OnlyAgent.selector);
        pool.collectFee{value: 1 ether}();
    }

    function test_distributeRoundProportional() public {
        // Fund the pool
        vm.prank(agent);
        pool.collectFee{value: 100 ether}();
        // 50 ether in winner pool, 1% per round = 0.5 ether

        address[] memory winners = new address[](2);
        winners[0] = alice;
        winners[1] = bob;
        uint256[] memory shares = new uint256[](2);
        shares[0] = 7000; // 70%
        shares[1] = 3000; // 30%

        vm.prank(tournament);
        pool.distributeRound(1, winners, shares);

        assertEq(pool.claimable(alice), 0.35 ether); // 0.5 * 70%
        assertEq(pool.claimable(bob), 0.15 ether); // 0.5 * 30%
        assertEq(pool.winnerPoolBalance(), 49.5 ether);
    }

    function test_cannotDistributeRoundTwice() public {
        vm.prank(agent);
        pool.collectFee{value: 100 ether}();

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(tournament);
        pool.distributeRound(1, winners, shares);

        vm.prank(tournament);
        vm.expectRevert(BountyPool.AlreadyDistributed.selector);
        pool.distributeRound(1, winners, shares);
    }

    function test_claimTransfersAndZeroes() public {
        vm.prank(agent);
        pool.collectFee{value: 100 ether}();

        address[] memory winners = new address[](1);
        winners[0] = alice;
        uint256[] memory shares = new uint256[](1);
        shares[0] = 10000;

        vm.prank(tournament);
        pool.distributeRound(1, winners, shares);

        uint256 claimable = pool.claimable(alice);
        assertEq(claimable, 0.5 ether);

        uint256 before = alice.balance;
        vm.prank(alice);
        pool.claim();

        assertEq(alice.balance, before + 0.5 ether);
        assertEq(pool.claimable(alice), 0);
        assertEq(pool.totalDistributed(), 0.5 ether);
    }

    function test_claimRevertsWithNoRewards() public {
        vm.prank(alice);
        vm.expectRevert(BountyPool.NoRewards.selector);
        pool.claim();
    }

    function test_lengthMismatchReverts() public {
        vm.prank(agent);
        pool.collectFee{value: 10 ether}();

        address[] memory winners = new address[](2);
        uint256[] memory shares = new uint256[](1);
        vm.prank(tournament);
        vm.expectRevert(BountyPool.LengthMismatch.selector);
        pool.distributeRound(1, winners, shares);
    }

    function test_onlyOwnerCanWithdrawOps() public {
        vm.prank(agent);
        pool.collectFee{value: 100 ether}();

        vm.prank(alice);
        vm.expectRevert(BountyPool.OnlyOwner.selector);
        pool.withdrawOps(alice, 1 ether);

        // Owner can
        pool.withdrawOps(ops, 5 ether);
        assertEq(ops.balance, 5 ether);
        assertEq(pool.opsPoolBalance(), 15 ether);
    }

    function test_emptyWinnersIsNoop() public {
        vm.prank(agent);
        pool.collectFee{value: 10 ether}();

        address[] memory winners = new address[](0);
        uint256[] memory shares = new uint256[](0);
        vm.prank(tournament);
        pool.distributeRound(1, winners, shares);

        assertTrue(pool.roundDistributed(1));
        assertEq(pool.winnerPoolBalance(), 5 ether); // unchanged
    }

    receive() external payable {}
}
