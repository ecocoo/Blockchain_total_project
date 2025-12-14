import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  await deploy("BestYearForGamesVoting", {
    from: deployer,
    args: [], 
    log: true,
    autoMine: true,
  });

  console.log("BestYearForGamesVoting deployed!");
  
  await hre.ethers.getContract("BestYearForGamesVoting", deployer);
};

export default func;
func.tags = ["BestYearForGamesVoting"];