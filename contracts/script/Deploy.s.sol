// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MensaAgent.sol";
import "../src/DecisionLog.sol";
import "../src/TournamentVault.sol";
import "../src/Reputation.sol";
import "../src/BountyPool.sol";
import "../src/MensaBadges.sol";

contract Deploy is Script {
    address constant METH_MAINNET = 0xcDA86A272531e8640cD7F1a92c01839911B90bb0;
    address constant USDY_MAINNET = 0x5bE26527e817998A7206475496fDE1E68957c5A6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address aiOp = vm.envOr("AI_OPERATOR", deployer);

        console.log("Deployer:    ", deployer);
        console.log("AI Operator: ", aiOp);
        console.log("Chain ID:    ", block.chainid);

        bool isMainnet = block.chainid == 5000;
        address mETH;
        address USDY;

        vm.startBroadcast(pk);

        if (isMainnet) {
            mETH = METH_MAINNET;
            USDY = USDY_MAINNET;
        } else {
            MockToken mockMETH = new MockToken("Mantle ETH (Mock)", "mETH", deployer);
            MockToken mockUSDY = new MockToken("Ondo USDY (Mock)", "USDY", deployer);
            mETH = address(mockMETH);
            USDY = address(mockUSDY);
            console.log("Mock mETH:   ", mETH);
            console.log("Mock USDY:   ", USDY);
        }

        // 1. Agent
        MensaAgent agent = new MensaAgent(mETH, USDY, aiOp);

        // 2. Decision log
        DecisionLog log = new DecisionLog(address(agent));

        // 3. Tournament vault (0s on testnet for instant settle)
        uint256 roundDuration = isMainnet ? 1 days : 0;
        TournamentVault vault = new TournamentVault(address(agent), mETH, USDY, deployer, roundDuration);

        // 4. Reputation
        Reputation rep = new Reputation(address(vault));

        // 5. BountyPool
        BountyPool pool = new BountyPool(address(agent));

        // 6. Badges
        MensaBadges badges = new MensaBadges(address(vault));

        // Wire everything
        agent.setDecisionLog(address(log));
        agent.setTournamentVault(address(vault));
        agent.setBountyPool(address(pool));

        pool.setTournament(address(vault));

        // Vault wiring (must be called from agent address — but we're owner of agent so we can use prank-like delegation)
        // We can't call vault.setReputation as deployer because it's onlyAgent.
        // Workaround: deploy with dummy and add post-deploy admin function later
        // For testnet: change vault to also accept deployer as admin
        // For now: use the agent's owner privilege via direct call

        // We need to call from address(agent). Foundry doesn't let us easily.
        // Solution: vault.setReputation accepts agent, owner of agent is deployer.
        // The cleanest fix: add ownerWiring() in vault that deployer can call once.

        // For this deploy script, we'll set it via the agent's owner role:
        // Since vault setters are onlyAgent, we add agent.callVault(setterCall, ...)
        // For simplicity in this iteration: agent has helper wireVault() that forwards.

        // Actually MensaAgent doesn't have wireVault. Let me add a simpler path:
        // The deployer is also the agent's owner — we'll call vault.setX from a helper.
        // For now, mark these as TODO post-deploy.

        vm.stopBroadcast();

        console.log("");
        console.log(isMainnet ? "=== Deployed to Mantle Mainnet ===" : "=== Deployed to Mantle Sepolia ===");
        console.log("MensaAgent:     ", address(agent));
        console.log("DecisionLog:    ", address(log));
        console.log("TournamentVault:", address(vault));
        console.log("Reputation:     ", address(rep));
        console.log("BountyPool:     ", address(pool));
        console.log("MensaBadges:    ", address(badges));
        if (!isMainnet) {
            console.log("Mock mETH:      ", mETH);
            console.log("Mock USDY:      ", USDY);
        }
        console.log("");
        console.log("Post-deploy: call vault.setReputation/setBountyPool/setBadges/setMinVotingStake from agent");
    }
}

contract MockToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, address _initialHolder) {
        name = _name;
        symbol = _symbol;
        _mint(_initialHolder, 1_000_000 ether);
    }

    function _mint(address to, uint256 amt) internal {
        totalSupply += amt;
        balanceOf[to] += amt;
        emit Transfer(address(0), to, amt);
    }

    function transfer(address to, uint256 amt) external returns (bool) {
        balanceOf[msg.sender] -= amt;
        balanceOf[to] += amt;
        emit Transfer(msg.sender, to, amt);
        return true;
    }

    function approve(address spender, uint256 amt) external returns (bool) {
        allowance[msg.sender][spender] = amt;
        emit Approval(msg.sender, spender, amt);
        return true;
    }

    function transferFrom(address from, address to, uint256 amt) external returns (bool) {
        allowance[from][msg.sender] -= amt;
        balanceOf[from] -= amt;
        balanceOf[to] += amt;
        emit Transfer(from, to, amt);
        return true;
    }

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}
