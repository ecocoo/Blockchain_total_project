import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

// Функция деплоя контракта голосования
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Деплоим контракт BestYearForGamesVoting
  await deploy("BestYearForGamesVoting", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  console.log("BestYearForGamesVoting deployed!");

  // Получаем экземпляр контракта для дальнейшего использования
  await hre.ethers.getContract("BestYearForGamesVoting", deployer);
};

export default func;
func.tags = ["BestYearForGamesVoting"];
