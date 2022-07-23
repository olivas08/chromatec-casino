import React, { Component } from "react";
import Lottery from "./artifacts/Lottery.json";
import Chroma from "./artifacts/Chroma.json";
import Web3 from "web3";
import "./App.css";
import "@lottiefiles/lottie-player";
import StatusBar from "./components/StatusBar/StatusBar";
import ToastMessage from "./components/ToastMessage/ToastMessage";
import TimeRemaining from "./components/TimeRemaining/TimeRemaining";
import TicketsSold from "./components/TicketsSold/TicketsSold";
import WonTotal from "./components/WonTotal/WonTotal";
import CwiWallet from "./components/CwiWallet/CwiWallet";
import CwiHistory from "./components/CwiHistory/CwiHistory";
import Pot from "./components/Pot/Pot";
import TicketMachine from "./components/TicketMachine/TicketMachine";
import TicketPurchase from "./components/TicketPurchase/TicketPurchase";

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
        web3: null,
        account: null,
        contract: null,
        balance: 0,
        address: null,
        ticketPrice:null,
        withdrawalAmount: null,
        chromaContract : null,
        chromaAddress: null,
        nextSpin: null,
        soundEffectsEnabled: true,
        music:null,
        awaitingResult: false,
        toastMessage: null,
        admin:null,
        lotteryWinner:null,
        lotteryWinnerDate:null,
        devMode: (process.env.NODE_ENV==='development'),
        statusBar: {
          text: null,
          color: 0
        },
        timeRemaining : '...',
        totalTicketsSold: 0,
        buyTicketCount: 1,
        boughtTicketCount: 0,
        potAmount: 0,
        ticketBuyLimit: 100,
        isWinner: false
    }

    this.music = null;
    this.checkNextSpinTimer = null;
  }

  componentDidMount = async () => {
    await this.loadBlockchainData();
    this.backgroundMusicInit();

    window.cwiShowWinner = this.showWinnerModal;
    window.cwiHideWinner = this.hideWinnerModal;
  }

  async loadBlockchainData() {
    const web3 = new Web3(window.ethereum);
    const web3EventReader = new Web3('wss://rpc-mumbai.maticvigil.com/ws/v1/50592ddbc4f80b8ef900bf59d707b39ab1632c52');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    window.ethereum.on('chainChanged', (_chainId) => window.location.reload());

    if(accounts.length>0) {
      this.setState( { account: accounts[0]});
      const networkId = await web3.eth.net.getId();

      const lotteryData  = Lottery.networks[networkId];
      const chromaData  = Chroma.networks[networkId];
      this.setState( { web3})
      const lottery = new web3.eth.Contract(Lottery.abi, lotteryData.address);
      const lotteryEvents = new web3EventReader.eth.Contract(Lottery.abi, lotteryData.address);
      const chroma = new web3.eth.Contract(Chroma.abi,chromaData.address);
      this.setState( { contract : lottery, chromaContract: chroma});

      let balance = await lottery.methods.checkBalance().call({from:this.state.account});
      balance = Web3.utils.fromWei(balance.toString(), 'ether');

      let lotteryAddress = await lotteryData.address;
      let chromaAddress = await chromaData.address;

      let price = await lottery.methods.ticketPrice().call({from:lotteryAddress});

      let admin = await chroma.methods.admin().call();

      lotteryEvents.events.SpinComplete({}, (error, data) => {
        if (error) {
          console.error("SpinComplete: " + error);
        } else {
          this.spinCompleteEvent(data.returnValues.userAddress);
        }
      });

      lotteryEvents.events.NewSpinDate({}, (error, data) => {
        if (error) {
          console.error("NewSpinDate: " + error);
        } else {
          this.setState({ nextSpin: data.returnValues.nextSpin});
        }
      });
      lotteryEvents.events.AllTicketsBought({}, (error, data) => {
        if (error) {
          console.error("NewSpinDate: " + error);
        } else {
          clearInterval(this.checkNextSpinTimer);
          this.setState({awaitingResult:true});
        }
      });
      
      this.state.contract.methods.nextSpin().call({from:this.state.account}).then(date => {
        console.log('getNextSpin', date);
        this.setState( { nextSpin : date });
      });
      
      this.state.contract.methods.ticketCount().call({ from: this.state.account }).then(totalTickets => {
        console.log('ticketCount', totalTickets);
        this.setState( { totalTicketsSold : totalTickets });
      });
      
      this.state.contract.methods.numTicketsBought().call({ from: this.state.account }).then(totalTickets => {
        console.log('numTicketsBought', totalTickets);
        this.setState( { boughtTicketCount : totalTickets });
      });

      this.state.contract.methods.getPotAmount().call({ from: this.state.account }).then(amount => {
        console.log('getPotAmount', Web3.utils.fromWei(amount.toString(), 'ether'));
        this.setState( { potAmount : Web3.utils.fromWei(amount.toString(), 'ether') });
      });

      this.state.contract.methods.latestWinner().call({ from: this.state.account }).then(account => {
        this.setState({ lotteryWinner: account });
      });

      this.state.contract.methods.lastSpin().call({ from: this.state.account }).then(date => {
        this.setState({ lotteryWinnerDate: date });
      });

      this.setState( {
        balance: balance.toString(),
        address:lotteryAddress,
        chromaAddress: chromaAddress,
        ticketPrice:price,
        admin:admin.toString()
      });

      this.checkNextSpinTimer = setInterval(this.checkNextSpin, 500);
      setInterval(this.retrieveBalance,(1000*30));

      this.updateTicketTotalPrice();
      

    } else {
      this.setStatusBarText('Connect your wallet to start playing. ',1);
      if(this.state.devMode) console.log('no account connected');
    }
  }

  spinCompleteEvent = (winnerAccount) => {
    this.setState({ awaitingResult:false, lotteryWinner: winnerAccount });
    if (String(winnerAccount.toLowerCase()) === String(this.state.account)) {
      console.log('You Won!')
      this.showWinnerModal();
    } else {
      console.log('Better luck next time.')
    }

  }

  checkNextSpin = () => {
    const serverDateTime = new Date(this.state.nextSpin*1000);
    const userDateTime = new Date();
    if(((userDateTime/1000)|0) === (serverDateTime/1000)) {
      clearInterval(this.checkNextSpinTimer);
      this.setState({awaitingResult:true});
    }
  }


  retrieveBalance = () => {
    this.state.contract.methods.ticketCount().call({ from: this.state.contract.address }).then(totalTickets => {
      this.setState( { totalTicketsSold : totalTickets });
    });
    this.state.contract.methods.getPotAmount().call({ from: this.state.account }).then(amount => {
      this.setState( { potAmount : Web3.utils.fromWei(amount.toString(), 'ether') });
    });
    this.state.contract.methods.checkBalance().call({ from: this.state.account }).then(totalWinnings => {
      totalWinnings = Web3.utils.fromWei(totalWinnings.toString(), 'ether');
      this.setState( { balance : totalWinnings });
    });
  }
  

  // ===========================================
  // MUSIC

  backgroundMusicInit = () => {
    const songs = [
      "/music/music6.mp3",
      "/music/music5.mp3",
      "/music/music4.mp3",
      "/music/music3.mp3",
      "/music/music2.mp3"
    ];
    let _currentTrack = Math.floor(Math.random() * 5);
    this.music = new Audio(songs[_currentTrack]);

    this.music.volume = 0;
    // this.music.play();
    

    const _playBack = () => {
      if (this.music.paused) {
        this.music.play();
      } else {
        this.music.pause();
      }
    };

    const _setTrack = () => {
      var songURL = songs[_currentTrack];
      this.music.setAttribute("src", songURL);
      this.music.load();
      _playBack();
    };

    const _trackHasEnded = () => {
      parseInt(_currentTrack);
      _currentTrack = (_currentTrack === 5) ? 1 : _currentTrack + 1;
      _setTrack();
    };

    this.music.addEventListener("ended", () => {
      _trackHasEnded();
    }, false);

    setTimeout(() => {
      this.music.volume = (this.state.soundEffectsEnabled) ? 0.1 : 0;
    }, 2000);

  }
  toggleMusic = () => {
      this.setState({soundEffectsEnabled:!this.state.soundEffectsEnabled}, () => {
        this.music.volume = (this.state.soundEffectsEnabled) ? 0.1 : 0;
      });
  }

  // ===========================================
  // STATUS SCREENS

  noMoreTickets = () => {
    this.setState({awaitingResult: true});
  }
  ticketsAllowed = () => {
    this.setState({awaitingResult: false});
  }
  showWinnerModal = () => {
    this.setState({ isWinner: true });
  }
  hideWinnerModal = () => {
    this.setState({ isWinner: false });
  }

  // ===========================================
  // OTHER


  buyTicket = (button) => {
    this.setStatusBarText('Sending request for approval...',0);
    button.target.disabled = true;
    button.target.textContent = 'buying...';

      this.state.chromaContract.methods.approve(this.state.address, this.state.ticketPrice)
        .send({ from: this.state.account })
        .then( () => {
          this.setStatusBarText('Waiting for blockchain validation...',0);
          
          const qty = (this.state.buyTicketCount && this.state.buyTicketCount>0) ? this.state.buyTicketCount : 1;
          this.state.contract.methods.buyTicket(qty).send({ from: this.state.account}).then(() => {
            this.setStatusBarText('Ticket bought successfully.',1);
            button.target.disabled = false;
            button.target.textContent = 'Buy Tickets';

            this.setState({ buyTicketCount : 1 }, () => {
              this.updateTicketTotalPrice();
            });

            this.state.contract.methods.numTicketsBought().call({ from: this.state.account }).then(totalTickets => {
              this.setState( { boughtTicketCount : totalTickets });
            });
          });
        })
        .catch(() => {
          button.target.disabled = false;
          button.target.textContent = 'Buy Tickets';
        });
      }

  withdrawWinnings = () => {
    if(!this.state.awaitingResult) {
      this.state.contract.methods.Withdraw().send({from: this.state.account}).then(() => {

      }).catch((e) => {
        console.log('withdrawWinnings', e)
      });
    }
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

  isAbleToPlay = () => {
    return this.state.account && this.state.web3;
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

  handleTicketCount = (event) => {
    const _buyTicketCount = parseInt(this.state.buyTicketCount);

    if (_buyTicketCount<=0) {
      this.setState({ buyTicketCount : 1 });
    }
    else if (_buyTicketCount>this.state.ticketBuyLimit) {
      this.setState({ buyTicketCount : this.state.ticketBuyLimit });
    } else {
      this.setState({ buyTicketCount : event.target.value });
    }
  }

  handTicketInput = (event) => {
    event.target.validity.valid || (event.target.value='1');
    this.setState({ buyTicketCount : 1 }, () => {
      this.updateTicketTotalPrice();
    });
  }

  ticketDecreaseCount = () => {
    const _buyTicketCount = parseInt(this.state.buyTicketCount);

    if(_buyTicketCount>1) {
      this.setState({ buyTicketCount : _buyTicketCount-1 }, () => {
        this.updateTicketTotalPrice();
      });
    }
  }

  ticketIncreaseCount = () => {
    const _buyTicketCount = parseInt(this.state.buyTicketCount);

    if(_buyTicketCount<this.state.ticketBuyLimit) {
      this.setState({ buyTicketCount : _buyTicketCount+1 }, () => {
        this.updateTicketTotalPrice();
      });
    }
  }

  updateTicketTotalPrice = () => {
    const _totalPrice = parseInt(this.state.buyTicketCount) * parseInt(Web3.utils.fromWei(this.state.ticketPrice.toString(), 'ether'));
    this.setState({ ticketTotalPrice : _totalPrice });
  }

  render() {
    return (
      <div className="App">
        <div className="cwi-logo" />
        { (this.state.lotteryWinner) ?
          <CwiHistory account={ this.state.lotteryWinner } date={ this.state.lotteryWinnerDate } />
        : null }
        <div className="cwi-topbar">
          <button onClick={this.toggleMusic} className="cwi-toggle-music">
            {(!this.state.soundEffectsEnabled) ? <span>🔈</span> : <span>🔊</span> }
          </button>

          {(this.isAbleToPlay()) ? 
            <CwiWallet balance={this.state.balance} casinoBalance={this.state.casinoBalance} addBalanceEvent={this.addBalance} removeBalanceEvent={this.removeBalance} wallet={this.state.account} />
            :
            <button onClick={this.requestAccountConnect} className="cwi-connect-btn">Connect Wallet</button>
          }
        </div>


        { (this.state.spinResult) ?
        <div className="cwi-winningNumber">
          { this.state.spinResult }
        </div>
        : null }
      
        <div className="cwi-table">
          <div className="cwi-copyright">A Chromatec Project</div>
          <StatusBar text={ this.state.statusBar.text } />
          <div className="cwi-table__content">
            <div className="cwi-table__content-right">
              <TimeRemaining date={ this.state.nextSpin } boughtTicketCount={this.state.boughtTicketCount} />
              <TicketsSold tickets={ this.state.totalTicketsSold } />
            </div>
            <div className="cwi-table__content-left">
              <WonTotal value={ this.state.balance } />

              {(!this.isAbleToPlay()) ?
                  <div><br />Connect your wallet first.<br /><br />
                    <button onClick={ this.requestAccountConnect } className="cwi-connect-play-btn">Connect Wallet</button>
                  </div>
                : null }

              { (this.state.balance>0) ?
              <div>
                <br />
                <button onClick={ this.withdrawWinnings }>Claim Winnings</button>
              </div>
              : null }
            </div>


            <TicketPurchase
              handleTicketCount = { this.handleTicketCount }
              handTicketInput = { this.handTicketInput }
              isAbleToPlay =  { this.isAbleToPlay() }
              buyTicket =  { this.buyTicket }
              ticketIncreaseCount =  { this.ticketIncreaseCount }
              ticketDecreaseCount =  { this.ticketDecreaseCount }
              ticketBuyLimit = { this.state.ticketBuyLimit }
              awaitingResult = { this.state.awaitingResult }
              ticketTotalPrice = { this.state.ticketTotalPrice }
              buyTicketCount = { this.state.buyTicketCount } />

            <TicketMachine ticketCount = { this.state.boughtTicketCount } />

            <Pot total = { this.state.potAmount } />
          </div>


          { (this.state.awaitingResult) ?
            <div className="cwi-nomorebets">
              <lottie-player src="https://assets3.lottiefiles.com/packages/lf20_aBZEgS.json" background="transparent" speed="1" loop autoplay></lottie-player>
              The winning ticket is being picked by the blockchain...
            </div>
          : null }


        </div>

          { (this.state.isWinner) ?
            <div className="cwi-winner-modal">
              <lottie-player src="https://assets2.lottiefiles.com/private_files/lf30_kvdn44jg.json" background="transparent" speed="1" autoplay></lottie-player>
              <div className="cwi-winner-modal__content">
                <div className="cwi-winner-modal__content-title">
                  You won! huhu!
                </div>
                <div className="cwi-winner-modal__content-body">
                You got the winning ticket.<br />
You won { this.state.potAmount } Chroma
                </div>
                <button className="cwi-winner-modal__content-button" onClick={ this.hideWinnerModal }>Buy more tickets</button>                
              </div>
            </div>
          : null }

        <ToastMessage message={this.state.toastMessage} />        
      </div>
    );
  }


}

export default App;
