// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/// @title MensaBadges
/// @notice Soulbound NFT achievements for tournament participants
/// @dev Non-transferable. Minted by Tournament contract on milestones.
contract MensaBadges is ERC721 {
    using Strings for uint256;

    enum BadgeType {
        FIRST_VOTE,           // First time voting
        BEAT_AI_10X,          // Beat AI 10 times
        BEAT_AI_100X,         // Beat AI 100 times
        STREAK_5,             // 5 wins in a row
        REPUTATION_500,       // Reach 500 reputation
        REPUTATION_1000,      // Reach 1000 reputation
        TOP_10_MONTHLY        // Top 10 voter for the month
    }

    address public immutable tournament;
    address public owner;

    uint256 private _nextId = 1;
    mapping(uint256 => BadgeType) public badgeType;
    mapping(address => mapping(BadgeType => bool)) public hasBadge;

    string public baseURI = "https://mensa.xyz/api/badge/";

    error OnlyTournament();
    error OnlyOwner();
    error AlreadyOwned();
    error Soulbound();

    constructor(address _tournament) ERC721("Mensa Achievement", "MENSA") {
        tournament = _tournament;
        owner = msg.sender;
    }

    modifier onlyTournament() { if (msg.sender != tournament && msg.sender != owner) revert OnlyTournament(); _; }
    modifier onlyOwner() { if (msg.sender != owner) revert OnlyOwner(); _; }

    function mint(address to, BadgeType bt) external onlyTournament returns (uint256 id) {
        if (hasBadge[to][bt]) revert AlreadyOwned();
        hasBadge[to][bt] = true;
        id = _nextId++;
        badgeType[id] = bt;
        _mint(to, id);
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        _requireOwned(id);
        return string.concat(baseURI, uint256(badgeType[id]).toString(), ".json");
    }

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
    }

    /// @dev Override to make tokens soulbound (non-transferable)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // Allow minting (from = 0) but block transfers
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }
}
