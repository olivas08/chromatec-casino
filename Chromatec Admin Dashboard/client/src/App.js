import React, { Component } from "react";
import Roulette from "./artifacts/Roulette.json";
import Chroma from "./artifacts/Chroma.json";
import Lottery from "./artifacts/Lottery.json";
import Web3 from "web3";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
        web3: null,
        account: null,
        rouletteContract: null,
        lotteryContract: null,
        rouletteBalance: 0,
        address: null,
        chromaContract : null,
        chromaAddress: null,
        lotteryBalance: null,
        rouletteNextSpin: null,
        lotteryNextSpin: null,
        awaitingResult: false,
        canBet: false,
        toastMessage: null,
        admin:null,
        devMode: (process.env.NODE_ENV==='development'),
        statusBar: {
          text: null,
          color: 0
        },
        rouletteTimeRemaining : '...',
        lotteryTimeRemaining : '...'
    }

    this.checkNextRouletteSpinTimer = null;

  }

  componentDidMount = async () => {
    await this.loadBlockchainData();
  }

  async loadBlockchainData() {

    const web3 = new Web3(window.ethereum);
    const web3EventReader = new Web3('wss://rpc-mumbai.maticvigil.com/ws/v1/50592ddbc4f80b8ef900bf59d707b39ab1632c52');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if(accounts.length>0) {
      this.setState( { account: accounts[0]});
      const networkId = await web3.eth.net.getId();

      const rouletteData  = Roulette.networks[networkId];
      const lotteryData = Lottery.networks[networkId];
      const chromaData  = Chroma.networks[networkId];
      this.setState( { web3:web3});
      const roulette = new web3.eth.Contract(Roulette.abi, rouletteData.address);
      const chroma = new web3.eth.Contract(Chroma.abi,chromaData.address);
      const lottery = new web3.eth.Contract(Lottery.abi, lotteryData.address);
      const rouletteEvents = new web3EventReader.eth.Contract(Roulette.abi, rouletteData.address);
      const lotteryEvents = new web3EventReader.eth.Contract(Lottery.abi, lotteryData.address);

      this.setState( { rouletteContract : roulette, chromaContract: chroma, lotteryContract: lottery});

      let rouletteBalance = await roulette.methods.checkBalance().call({from:this.state.admin});
      rouletteBalance = Web3.utils.fromWei(rouletteBalance.toString(), 'ether');

      let lotteryChromaBalance = await chroma.methods.balanceOf(rouletteData.address).call();
      lotteryChromaBalance = Web3.utils.fromWei(lotteryChromaBalance.toString(), 'ether');

      let rouletteAddress = await rouletteData.address;
      let lotteryAddress = await lotteryData.address;
      let chromaAddress = await chromaData.address;

      let admin = await chroma.methods.admin().call();

      lotteryEvents.events.SpinComplete({}, (error, data) => {
        if (error) {
          console.error("SpinComplete: " + error);
        } else {
          this.chosenWinnerEvent(data.returnValues.userAddress);
        }
      });

      lotteryEvents.events.NewSpinDate({}, (error, data) => {
        if (error) {
          console.error("NewSpinDate: " + error);
        } else {
          this.setState({ lotteryNextSpin: data.returnValues.nextSpin});
        }
      });

      rouletteEvents.events.SpinComplete({}, (error, data) => {
        if (error) {
          console.error("SpinComplete: " + error);
        } else {
          this.spinCompleteEvent(data.returnValues.ballNumber);
        }
      });

      rouletteEvents.events.NewSpinDate({}, (error, data) => {
        if (error) {
          console.error("NewSpinDate: " + error);
        } else {
          this.setState({ rouletteNextSpin: data.returnValues.nextSpin});
        }
      });

      this.setState( {
        address:rouletteAddress,
        lotteryAddress:lotteryAddress,
        chromaAddress: chromaAddress,
        rouletteBalance: rouletteBalance.toString(),
        lotteryBalance: lotteryChromaBalance.toString(),
        admin:admin.toString()
      });

      this.state.rouletteContract.methods.getNextSpin().call({from:this.state.address}).then(nextSpinDate => {
        this.setState({ rouletteNextSpin: nextSpinDate}, () => {
          this.checkNextRouletteSpinTimer = setInterval( () => {
            this.betsCountdown();
          }, 1000);
        });
        
      });

      this.checkNextLotterySpinTimer = setInterval(this.checkNextSpin, 500);

    } else {
      this.setStatusBarText('You need to connect your Wallet',1);
      if(this.state.devMode) console.log('no account connected');
    }
  }

  spinCompleteEvent = (number) => {
    console.log('spinCompleteEvent', number);
    this.setStatusBarText(`The winning number was ${number}`,0);
    this.setState({spinResult:number});
    setTimeout(() => {
      this.setState({spinResult:null});
    }, 10000);

    this.checkNextRouletteSpinTimer = setInterval( () => {
      this.betsCountdown();
    }, 1000);

  }

  chosenWinnerEvent = (address) => {
    console.log('chosenWinnerEvent', address);
    this.setStatusBarText(`The winning address was ${address}`,0);
    this.setState({spinResult:address});
    setTimeout(() => {
      this.setState({spinResult:null});
    }, 10000);

    this.checkNextLotterySpinTimer = setInterval( () => {
      this.checkNextSpin();
    }, 1000);
  }

  betsCountdown = async () => {
    const serverDateTime = new Date(this.state.rouletteNextSpin * 1000);
    const userDateTime = new Date();
    const serverTime = serverDateTime.getHours() + ":" + serverDateTime.getMinutes();
    const userTime = userDateTime.getHours() + ":" + userDateTime.getMinutes();

    serverDateTime.setSeconds(0);

    let _timeDiff = serverDateTime.getTime() - userDateTime.getTime();
    let mins = Math.floor((_timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    let secs = Math.floor((_timeDiff % (1000 * 60)) / 1000);
    this.setState({rouletteTimeRemaining: `${mins}:${secs}`});

    if (serverTime === userTime) {
      clearInterval(this.checkNextRouletteSpinTimer);
      let encodedABI = this.state.rouletteContract.methods.spinWheel().encodeABI();
      let privateKey = 'privateKey';
      const nonce = await this.state.web3.eth.getTransactionCount(this.state.admin, 'latest'); // nonce starts counting from 0
      let tx = {
        from: this.state.admin,
        to: this.state.address,
        data: encodedABI,
        gas: 200000,
        nonce: nonce
      }
      let web3 = this.state.web3;
      web3.eth.accounts.signTransaction(tx, privateKey).then(signed => {
        web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', console.log)
      });
    }
    console.log(serverTime, userTime, 'Roulette');
  }

  checkNextSpin = async () => {
    const serverDateTime = new Date(this.state.lotteryNextSpin * 1000);
    const userDateTime = new Date();
    if (((userDateTime / 1000) | 0) === (serverDateTime / 1000)) {
      clearInterval(this.checkNextLotterySpinTimer);
      let encodedABI = this.state.lotteryContract.methods.requestRandomness().encodeABI();
      let privateKey = 'privateKey';
      const nonce = await this.state.web3.eth.getTransactionCount(this.state.admin, 'latest'); // nonce starts counting from 0
      let tx = {
        from: this.state.admin,
        to: this.state.lotteryAddress,
        data: encodedABI,
        gas: 200000,
        nonce: nonce
      }
      let web3 = this.state.web3;
      web3.eth.accounts.signTransaction(tx, privateKey).then(signed => {
        web3.eth.sendSignedTransaction(signed.rawTransaction).on('receipt', console.log)
      });
    }
  }

  checkBalance = () => {
    return this.state.rouletteContract.methods.checkBalance().call({from:this.state.account}).then(balance => {
      balance = Web3.utils.fromWei(balance.toString(), 'ether');
      this.state.rouletteContract.methods.maxBet().call({from:this.state.address}).then(mBet => {
        let casinoMaxBet = Web3.utils.fromWei(mBet.toString(), 'ether');
        this.setState( { rouletteBalance : balance.toString(), maxBet : casinoMaxBet });
      });
      return balance;
    });
  }

  upTimeRoulette = () => {
    this.state.rouletteContract.methods.upTime().send({from:this.state.admin}).then(() => {
      console.log('Time updated');
    });
  }

  upTimeLottery = () => {
    this.state.lotteryContract.methods.upTime().send({from:this.state.admin}).then(() => {
      console.log('Time updated');
    });
  }

  requestAccountConnect = () => {
    this.setStatusBarText(`Connecting to your wallet...`,0);
    window.ethereum.request({ method: 'eth_requestAccounts' })
    .then((accounts) => {
      this.setStatusBarText(null,0);
      this.loadBlockchainData();
    })
    .catch((error) =>  {     
      if(error.code === -32002) {
        window.location.reload();
      }
      if(this.state.devMode) console.error('requestAccountConnect', error)
    });
  }

  showToast = (message) => {
    this.setState({toastMessage: message});
    setTimeout(() => {
      this.setState({toastMessage: null});
    },4000);
  }

  setStatusBarText = (text, color = 0) => {
    this.setState({statusBar: { text: text, color: color }});
  }

  render() {

    return (
      <div className="App">
        <div className="cwi-app-roullete">
          <div className="cwi-toolbar">
            <button onClick={this.upTimeRoulette}>+1 minute Roulette</button>

            <button>Force Spin</button>
          </div>

          <div className="cwi-body">
            <div>
              <strong>Roulette Time Remaining</strong>
              <div> { this.state.rouletteTimeRemaining } </div>
              <strong>Lottery Time Remaining</strong>
              <div> { this.state.lotteryTimeRemaining } </div>
              <strong>Roulette Address</strong>
              <div> { this.state.address } </div>
              <strong>Lottery Address</strong>
              <div> { this.state.lotteryAddress } </div>
              <strong>Roulette Balance</strong>
              <div> { this.state.rouletteBalance } </div>
              <strong>Lottery Balance</strong>
              <div> { this.state.lotteryBalance } </div>
            </div>

            <div className="cwi-console">

            </div>
          </div>
        </div>

        { (this.state.statusBar.text) ? 
        <div className={`cwi-status-bar ${(this.state.statusBar.color === 1) ? ' cwi-status-bar--red' : 'cwi-status-bar--black'}`}>{ this.state.statusBar.text }</div>
        : null }
      </div>
    );
  }


}

export default App;
