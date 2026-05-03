// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MensaAgent.sol";
import "../src/DecisionLog.sol";
import "../src/TournamentVault.sol";

contract Deploy is Script {
    // Mantle Mainnet RWA contracts
    address constant METH = 0xcDA86A272531e8640cD7F1a92c01839911B90bb0;
    address constant USDY = 0x5bE26527e817998A7206475496fDE1E68957c5A6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address aiOp = vm.envOr("AI_OPERATOR", deployer);

        console.log("Deployer:", deployer);
        console.log("AI Operator:", aiOp);

        vm.startBroadcast(pk);

        // 1. Deploy agent
        MensaAgent agent = new MensaAgent(METH, USDY, aiOp);
        console.log("MensaAgent:", address(agent));

        // 2. Deploy decision log (agent is the only writer)
        DecisionLog log = new DecisionLog(address(agent));
        console.log("DecisionLog:", address(log));

        // 3. Deploy tournament vault
        TournamentVault vault = new TournamentVault(address(agent), METH, USDY);
        console.log("TournamentVault:", address(vault));

        // 4. Wire them up
        agent.setDecisionLog(address(log));
        agent.setTournamentVault(address(vault));

        // 5. Allow AI operator to settle rounds (must be called by agent)
        // Done via a separate tx since vault.setSettler is onlyAgent.
        // Workaround: setSettler is called from the agent contract using a permissioned wrapper,
        // OR we call it directly here via a low-level call from the agent.
        // For simplicity, the deployer is initially the AI operator, then we update later.

        vm.stopBroadcast();

        console.log("");
        console.log("=== Deployed to Mantle Mainnet ===");
        console.log("MensaAgent:     ", address(agent));
        console.log("DecisionLog:    ", address(log));
        console.log("TournamentVault:", address(vault));
        console.log("Explorer:       https://mantlescan.xyz/address/", address(agent));
    }
}
