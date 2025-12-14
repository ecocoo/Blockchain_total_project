// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract BestYearForGamesVoting {
    string public constant TITLE = "Best Year for Video Games (2015-2025)";
    string public constant DESCRIPTION = "Vote for the best year in gaming history (2015-2025).";
    uint256 public constant VOTING_DURATION = 30 days;
    uint256 public constant TOTAL_YEARS = 11;
    
    struct Voting {
        uint256 endTime;
        bool isActive;
        uint256[TOTAL_YEARS] votes;
        mapping(address => bool) hasVoted;
    }
    
    Voting public voting;

    event Voted(address indexed voter, uint256 yearIndex);

    modifier onlyActive() {
        require(voting.isActive, "Voting is not active");
        require(block.timestamp <= voting.endTime, "Voting has ended");
        _;
    }

    constructor() {
        voting.endTime = block.timestamp + VOTING_DURATION;
        voting.isActive = true;
    }

    function vote(uint256 _yearIndex) external onlyActive {
        require(!voting.hasVoted[msg.sender], "You have already voted");
        require(_yearIndex < TOTAL_YEARS, "Invalid year index (0-10)");
        
        voting.hasVoted[msg.sender] = true;
        voting.votes[_yearIndex]++;
        
        emit Voted(msg.sender, _yearIndex);
    }

    function getVotingInfo() external view returns (
        uint256 endTime,
        bool isActive,
        uint256[TOTAL_YEARS] memory votes,
        uint256 totalVotes
    ) {
        uint256 total = 0;
        for (uint256 i = 0; i < TOTAL_YEARS; i++) {
            total += voting.votes[i];
        }
        
        return (
            voting.endTime,
            voting.isActive,
            voting.votes,
            total
        );
    }

    function hasAddressVoted(address _voter) external view returns (bool) {
        return voting.hasVoted[_voter];
    }

    function getYearByIndex(uint256 _index) external pure returns (string memory) {
        require(_index < TOTAL_YEARS, "Invalid index");
        
        if (_index == 0) return "2015";
        if (_index == 1) return "2016";
        if (_index == 2) return "2017";
        if (_index == 3) return "2018";
        if (_index == 4) return "2019";
        if (_index == 5) return "2020";
        if (_index == 6) return "2021";
        if (_index == 7) return "2022";
        if (_index == 8) return "2023";
        if (_index == 9) return "2024";
        if (_index == 10) return "2025";
        
        return "";
    }
}