const Chroma= artifacts.require("./Chroma.sol");

module.exports = function(deployer) {
  deployer.deploy(Chroma);
};
