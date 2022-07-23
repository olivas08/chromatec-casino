const Roulette= artifacts.require("./Roulette.sol");
const Lottery= artifacts.require("./Lottery.sol");
const Chroma= artifacts.require("./Chroma.sol");

module.exports = function(deployer) {
  deployer.deploy(Roulette,Chroma.address).then(function() {
      return deployer.deploy(Lottery,Chroma.address);});
};
