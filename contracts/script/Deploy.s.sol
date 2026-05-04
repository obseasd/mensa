// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/MensaAgent.sol";
import "../src/DecisionLog.sol";
import "../src/TournamentVault.sol";

/// @title Deploy
/// @notice Deploys Mensa contracts. Detects network via chain id:
///         5000 = Mantle Mainnet (uses real mETH + USDY)
///         5003 = Mantle Sepolia testnet (uses mock tokens, deployed inline)
contract Deploy is Script {
    // Mantle Mainnet (chain id 5000)
    address constant METH_MAINNET = 0xcDA86A272531e8640cD7F1a92c01839911B90bb0;
    address constant USDY_MAINNET = 0x5bE26527e817998A7206475496fDE1E68957c5A6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        address aiOp = vm.envOr("AI_OPERATOR", deployer);

        console.log("Deployer:    ", deployer);
        console.log("AI Operator: ", aiOp);
        console.log("Chain ID:    ", block.chainid);

        // Pick token addresses based on network
        address mETH;
        address USDY;
        bool isMainnet = block.chainid == 5000;

        vm.startBroadcast(pk);

        if (isMainnet) {
            mETH = METH_MAINNET;
            USDY = USDY_MAINNET;
            console.log("Using MAINNET RWA contracts");
        } else {
            // Sepolia: deploy mock ERC20s for testing the full flow
            MockToken mockMETH = new MockToken("Mantle ETH (Mock)", "mETH", deployer);
            MockToken mockUSDY = new MockToken("Ondo USDY (Mock)", "USDY", deployer);
            mETH = address(mockMETH);
            USDY = address(mockUSDY);
            console.log("Mock mETH:   ", mETH);
            console.log("Mock USDY:   ", USDY);
        }

        // 1. Agent
        MensaAgent agent = new MensaAgent(mETH, USDY, aiOp);
        console.log("MensaAgent:     ", address(agent));

        // 2. Decision log
        DecisionLog log = new DecisionLog(address(agent));
        console.log("DecisionLog:    ", address(log));

        // 3. Tournament vault — pass deployer (EOA) as settler so we can settle from off-chain agent loop
        // 0-second roundDuration on testnet so we can settle immediately for demo
        // Mainnet would use 1 days
        uint256 roundDuration = isMainnet ? 1 days : 0;
        TournamentVault vault = new TournamentVault(address(agent), mETH, USDY, deployer, roundDuration);
        console.log("TournamentVault:", address(vault));

        // 4. Wire them up
        agent.setDecisionLog(address(log));
        agent.setTournamentVault(address(vault));

        vm.stopBroadcast();

        // 5. Allow AI operator to settle rounds (must come from agent contract)
        // We use vm.prank since this is a script — in production this would be
        // a wrapper function on MensaAgent that delegates to vault.setSettler.
        if (aiOp != deployer) {
            console.log("");
            console.log("NOTE: setSettler(aiOp) must be called from the agent contract address.");
            console.log("Add a wrapper to MensaAgent or call manually via cast.");
        }

        console.log("");
        console.log(isMainnet ? "=== Deployed to Mantle Mainnet ===" : "=== Deployed to Mantle Sepolia ===");
        console.log("MensaAgent:     ", address(agent));
        console.log("DecisionLog:    ", address(log));
        console.log("TournamentVault:", address(vault));
        if (!isMainnet) {
            console.log("Mock mETH:      ", mETH);
            console.log("Mock USDY:      ", USDY);
        }
    }
}

/// @notice Minimal ERC20 for testnet deployments
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
