// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/Reputation.sol";

contract ReputationTest is Test {
    Reputation rep;
    address tournament = address(this);
    address alice = address(0xA1);
    address bob = address(0xB0B);

    function setUp() public {
        rep = new Reputation(tournament);
    }

    function test_initialScore() public view {
        assertEq(rep.score(alice), 100);
        assertEq(rep.getWeight(alice), 10); // sqrt(100) = 10
    }

    function test_winIncreasesScore() public {
        rep.update(alice, true, 200); // outperformance 200bps
        assertEq(rep.score(alice), 150); // 100 + min(200/4, 50) = 150
    }

    function test_winCapsBoost() public {
        rep.update(alice, true, 1000); // big outperformance
        assertEq(rep.score(alice), 150); // capped at +50
    }

    function test_lossDecreasesScore() public {
        rep.update(alice, true, 200); // first get to 150
        rep.update(alice, false, -200); // lose by 200bps
        assertEq(rep.score(alice), 125); // 150 - min(200/8, 25) = 125
    }

    function test_lossFloorsAt50() public {
        // Take a fresh user, slam them with losses
        rep.update(bob, false, -1000);
        rep.update(bob, false, -1000);
        rep.update(bob, false, -1000);
        rep.update(bob, false, -1000);
        rep.update(bob, false, -1000);
        // Floor is INITIAL_SCORE / 2 = 50
        assertEq(rep.score(bob), 50);
    }

    function test_winRate() public {
        rep.update(alice, true, 100);
        rep.update(alice, false, -50);
        rep.update(alice, true, 200);
        assertEq(rep.winRate(alice), 66); // 2/3 = 66%
        assertEq(rep.totalVotes(alice), 3);
        assertEq(rep.correctVotes(alice), 2);
    }

    function test_weightScalesWithSqrt() public {
        // Bob earns to score 400
        rep.update(bob, true, 1000); // 100 -> 150
        rep.update(bob, true, 1000); // 150 -> 200
        rep.update(bob, true, 1000); // 200 -> 250
        rep.update(bob, true, 1000); // 250 -> 300
        rep.update(bob, true, 1000); // 300 -> 350
        rep.update(bob, true, 1000); // 350 -> 400
        assertEq(rep.score(bob), 400);
        assertEq(rep.getWeight(bob), 20); // sqrt(400) = 20
    }

    function test_onlyTournamentCanUpdate() public {
        vm.prank(alice);
        vm.expectRevert(Reputation.OnlyTournament.selector);
        rep.update(bob, true, 100);
    }

    function test_firstParticipationTracked() public {
        assertEq(rep.firstParticipation(alice), 0);
        rep.update(alice, true, 50);
        assertEq(rep.firstParticipation(alice), block.timestamp);
        assertTrue(rep.hasParticipated(alice));
    }
}
