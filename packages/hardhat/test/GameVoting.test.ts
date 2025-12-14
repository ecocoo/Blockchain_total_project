import { expect } from "chai";
import { ethers } from "hardhat";
import { BestYearForGamesVoting } from "../typechain-types";

describe("BestYearForGamesVoting", function () {
  let gameVoting: BestYearForGamesVoting;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const GameVotingFactory = await ethers.getContractFactory("BestYearForGamesVoting");
    gameVoting = await GameVotingFactory.deploy();
    await gameVoting.waitForDeployment();
  });

  describe("Деплой контракта", function () {
    it("Должен содержать корректные константы", async function () {
      void expect(await gameVoting.TITLE()).to.equal("Best Year for Video Games (2015-2025)");
      void expect(await gameVoting.DESCRIPTION()).to.equal("Vote for the best year in gaming history (2015-2025).");
      void expect(await gameVoting.TOTAL_YEARS()).to.equal(11);
      void expect(await gameVoting.VOTING_DURATION()).to.equal(30 * 24 * 60 * 60);
    });

    it("Должен иметь корректное начальное состояние", async function () {
      const votingInfo = await gameVoting.getVotingInfo();
      const endTime = votingInfo[0];
      const isActive = votingInfo[1];
      const votes = votingInfo[2];
      
      void expect(isActive).to.be.true; 
      void expect(votes.length).to.equal(11); 
      void expect(votes[0]).to.equal(0); 
      void expect(votes[10]).to.equal(0);
      
      const blockTime = (await ethers.provider.getBlock('latest'))!.timestamp;
      void expect(endTime).to.be.greaterThan(blockTime);
    });
  });

  describe("Получение года по индексу", function () {
    it("Должен возвращать правильный год для индекса", async function () {
      void expect(await gameVoting.getYearByIndex(0)).to.equal("2015");
      void expect(await gameVoting.getYearByIndex(5)).to.equal("2020");
      void expect(await gameVoting.getYearByIndex(10)).to.equal("2025");
    });

    it("Должен отклонять невалидный индекс", async function () {
      await expect(gameVoting.getYearByIndex(11)).to.be.revertedWith("Invalid index");
      await expect(gameVoting.getYearByIndex(100)).to.be.revertedWith("Invalid index");
    });
  });

  describe("Голосование", function () {
    it("Должен позволять пользователю голосовать за конкретный год", async function () {
      await gameVoting.connect(addr1).vote(3);
      
      const hasVoted = await gameVoting.hasAddressVoted(addr1.address);
      void expect(hasVoted).to.be.true; 
      
      const votingInfo = await gameVoting.getVotingInfo();
      const votes = votingInfo[2];
      void expect(votes[3]).to.equal(1); 
    });

    it("Не должен позволять пользователю голосовать дважды", async function () {
      await gameVoting.connect(addr1).vote(3);
      
      await expect(
        gameVoting.connect(addr1).vote(5)
      ).to.be.revertedWith("You have already voted");
    });

    it("Не должен позволять голосовать за невалидный индекс года", async function () {
      await expect(
        gameVoting.connect(addr1).vote(11)
      ).to.be.revertedWith("Invalid year index (0-10)");
    });

    it("Должен корректно отслеживать несколько голосов", async function () {
      await gameVoting.connect(addr1).vote(3);
      
      await gameVoting.connect(addr2).vote(5);
      
      const hasVoted1 = await gameVoting.hasAddressVoted(addr1.address);
      const hasVoted2 = await gameVoting.hasAddressVoted(addr2.address);
      
      void expect(hasVoted1).to.be.true; 
      void expect(hasVoted2).to.be.true; 
      
      const votingInfo = await gameVoting.getVotingInfo();
      const votes = votingInfo[2];
      const totalVotes = votingInfo[3];
      
      void expect(votes[3]).to.equal(1); 
      void expect(votes[5]).to.equal(1); 
      void expect(totalVotes).to.equal(2); 
    });
  });

  describe("Ограничение времени голосования", function () {
    it("Не должен позволять голосовать после окончания времени", async function () {
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);
      
      await expect(
        gameVoting.connect(addr1).vote(3)
      ).to.be.revertedWith("Voting has ended");
    });

    it("Должен позволять голосовать до окончания времени", async function () {
      await gameVoting.connect(addr1).vote(3);
      
      const hasVoted = await gameVoting.hasAddressVoted(addr1.address);
      void expect(hasVoted).to.be.true;
    });
  });

  describe("Получение информации о голосовании", function () {
    it("Должен возвращать корректное общее количество голосов", async function () {
      let votingInfo = await gameVoting.getVotingInfo();
      void expect(votingInfo[3]).to.equal(0); 
      
      await gameVoting.connect(addr1).vote(3);
      votingInfo = await gameVoting.getVotingInfo();
      void expect(votingInfo[3]).to.equal(1); 
      
      await gameVoting.connect(addr2).vote(7);
      votingInfo = await gameVoting.getVotingInfo();
      void expect(votingInfo[3]).to.equal(2); 
    });

    it("Должен возвращать корректный массив голосов", async function () {
      await gameVoting.connect(addr1).vote(3); 
      await gameVoting.connect(addr2).vote(3); 
      await gameVoting.connect(owner).vote(7);
      
      const votingInfo = await gameVoting.getVotingInfo();
      const votes = votingInfo[2];
      
      void expect(votes[3]).to.equal(2); 
      void expect(votes[7]).to.equal(1); 
      void expect(votes[0]).to.equal(0); 
      void expect(votes[10]).to.equal(0); 
    });
  });

  describe("Генерация событий", function () {
    it("Должен генерировать событие Voted при голосовании", async function () {
      await expect(gameVoting.connect(addr1).vote(3))
        .to.emit(gameVoting, "Voted")
        .withArgs(addr1.address, 3);
    });
  });

  describe("Крайние случаи", function () {
    it("Должен обрабатывать максимальный индекс (10)", async function () {
      await gameVoting.connect(addr1).vote(10);
      
      const hasVoted = await gameVoting.hasAddressVoted(addr1.address);
      void expect(hasVoted).to.be.true; 
      
      const votingInfo = await gameVoting.getVotingInfo();
      const votes = votingInfo[2];
      void expect(votes[10]).to.equal(1); 
    });

    it("Должен обрабатывать минимальный индекс (0)", async function () {
      await gameVoting.connect(addr1).vote(0);
      
      const hasVoted = await gameVoting.hasAddressVoted(addr1.address);
      void expect(hasVoted).to.be.true; 
      
      const votingInfo = await gameVoting.getVotingInfo();
      const votes = votingInfo[2];
      void expect(votes[0]).to.equal(1); 
    });
  });
});