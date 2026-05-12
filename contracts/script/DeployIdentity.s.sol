// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MensaAgentIdentity.sol";

/// @notice Deploy the ERC-8004 IdentityRegistry for Mensa, then register
///         agentId #1 pointing to the agent-card URI. Also writes the live
///         on-chain contracts as metadata entries.
contract DeployIdentity is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        string memory cardURI = vm.envOr("AGENT_CARD_URI", string("https://mensa-mu.vercel.app/api/agent-card"));

        console.log("Deployer:", deployer);
        console.log("Card URI:", cardURI);

        vm.startBroadcast(pk);

        MensaAgentIdentity reg = new MensaAgentIdentity();
        console.log("MensaAgentIdentity:", address(reg));

        MensaAgentIdentity.MetadataEntry[] memory entries = new MensaAgentIdentity.MetadataEntry[](2);
        entries[0] = MensaAgentIdentity.MetadataEntry({
            metadataKey: "model",
            metadataValue: bytes("Claude Haiku 4.5")
        });
        entries[1] = MensaAgentIdentity.MetadataEntry({
            metadataKey: "mensaAgent",
            metadataValue: abi.encodePacked(address(0xAcA925e51E7C801Af4E4080f041AF0ec112CCe49))
        });

        uint256 agentId = reg.register(cardURI, entries);
        console.log("Registered agentId:", agentId);

        vm.stopBroadcast();
    }
}
