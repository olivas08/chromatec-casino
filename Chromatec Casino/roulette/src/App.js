import React, { Component } from "react";
import Roulette from "./artifacts/Roulette.json";
import Chroma from "./artifacts/Chroma.json";
import Web3 from "web3";
import "./App.css";
import Chip from './components/Chip/Chip'
import BoardHouse from './components/BoardHouse/BoardHouse'
import { _boardHouses } from './components/BoardHouse/BoardHouse.enums';
import { ChipsEnum } from './components/Chip/Chip.enums';
import CwiWallet from "./components/CwiWallet/CwiWallet";
import CwiBook from "./components/CwiBook/CwiBook";
import CwiHistory from "./components/CwiHistory/CwiHistory";
import TWEEN from "@tweenjs/tween.js"

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
        web3: null,
        account: null,
        contract: null,
        balance: 0,
        address: null,
        betType: null,
        betNum: null,
        amount: 1000,
        activeChip: 'red',
        depositAmount: null,
        withdrawalAmount: null,
        chromaContract : null,
        chromaAddress: null,
        casinoBalance : null,
        placedBets : [],
        isBookOpen: false,
        maxBet: 0,
        pastWinnings: [],
        nextSpin: null,
        soundEffectsEnabled: true,
        music:null,
        awaitingResult: false,
        maxBetAchieved: false,
        totalPlacedBetsChroma: 0,
        canBet: false,
        ballNewAngle: undefined,
        ballStartAngle: 360,
        toastMessage: null,
        admin:null,
        spinResult:null,
        devMode: (process.env.NODE_ENV==='development'),
        statusBar: {
          text: null,
          color: 0
        },
        timeRemaining : '...'
    }
    this.chips = React.createRef();
    this.ball = React.createRef();
    this.music = null;
    this.tweenerBall = null;
    this.checkNextSpinTimer = null;

    this.winningNumbers = [
      { number:0, color: 'green' },
      { number:1, color: 'red' },
      { number:2, color: 'black' },
      { number:3, color: 'red' },
      { number:4, color: 'black' },
      { number:5 , color: 'red' },
      { number:6 , color: 'black' },
      { number:7 , color: 'red' },
      { number:8 , color: 'black' },
      { number:9 , color: 'red' },
      { number:10 , color: 'black' },
      { number:11 , color: 'black' },
      { number:12 , color: 'red' },
      { number:13 , color: 'black' },
      { number:14 , color: 'red' },
      { number:15 , color: 'black' },
      { number:16 , color: 'red' },
      { number:17 , color: 'black' },
      { number:18 , color: 'red' },
      { number:19 , color: 'red' },
      { number:20 , color: 'black' },
      { number:21 , color: 'red' },
      { number:22 , color: 'black' },
      { number:23 , color: 'red' },
      { number:24 , color: 'black' },
      { number:25 , color: 'red' },
      { number:26 , color: 'black' },
      { number:27 , color: 'red' },
      { number:28 , color: 'black' },
      { number:29 , color: 'black' },
      { number:30 , color: 'red' },
      { number:31 , color: 'black' },
      { number:32 , color: 'red' },
      { number:33 , color: 'black' },
      { number:34 , color: 'red' },
      { number:35 , color: 'black' },
      { number:36 , color: 'red' }
    ]
  }

  componentDidMount = async () => {
    await this.loadBlockchainData();
    this.backgroundMusicInit();
  }

  async loadBlockchainData() {

    const web3 = new Web3(window.ethereum);
    const web3EventReader = new Web3('wss://rpc-mumbai.maticvigil.com/ws/v1/50592ddbc4f80b8ef900bf59d707b39ab1632c52');
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if(accounts.length>0) {
      this.setState( { account: accounts[0]});
      const networkId = await web3.eth.net.getId();

      const rouletteData  = Roulette.networks[networkId];
      const chromaData  = Chroma.networks[networkId];
      this.setState( { web3})
      const roulette = new web3.eth.Contract(Roulette.abi, rouletteData.address);
      const rouletteEvents = new web3EventReader.eth.Contract(Roulette.abi, rouletteData.address);
      const chroma = new web3.eth.Contract(Chroma.abi,chromaData.address);
      this.setState( { contract : roulette, chromaContract: chroma});

      let balance = await roulette.methods.checkBalance().call({from:this.state.account});
      balance = Web3.utils.fromWei(balance.toString(), 'ether');
    
      let casinoChromaBalance = await chroma.methods.balanceOf(rouletteData.address).call();
      casinoChromaBalance = Web3.utils.fromWei(casinoChromaBalance.toString(), 'ether');

      let casinoMaxBet = await roulette.methods.maxBetValue().call({from:this.state.contract.address});
      casinoMaxBet = Web3.utils.fromWei(casinoMaxBet.toString(), 'ether');

      let rouletteAddress = await rouletteData.address;
      let chromaAddress = await chromaData.address;

      let admin = await chroma.methods.admin().call();

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
          this.setState({ nextSpin: data.returnValues.nextSpin});
        }
      });

      rouletteEvents.events.BetsClosed({}, () => {
        this.setState({timeRemaining : `closed`});
        this.noMoreBets();
        this.ballReset();
        this.setStatusBarText(`All bets are off. Waiting for result...`,0);
      });

      this.setState( {
        balance: balance.toString(),
        address:rouletteAddress,
        chromaAddress: chromaAddress,
        maxBet: casinoMaxBet,
        casinoBalance: casinoChromaBalance.toString(),
          admin:admin.toString()
      });
      
      this.updateTotal();

      this.state.contract.methods.getNextSpin().call({from:this.state.contract.address}).then(nextSpinDate => {
        this.setState({ nextSpin: nextSpinDate}, () => {
          this.checkNextSpinTimer = setInterval( () => {
            this.betsCountdown();
          }, 1000);
        });
        
      });

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
    this.addToHistory(number);
    this.ballToNumber(number);

    this.checkNextSpinTimer = setInterval( () => {
      this.betsCountdown();
    }, 1000);

    this.state.contract.methods.checkDidWin().call({from:this.state.account}).then((dWin) => {
      console.log('checkDidWin', dWin);
      
      this.betsAllowed();
      this.clearBets();

      if(dWin==1){
        this.setStatusBarText("better luck next time");
      } else if(dWin==2) {
        const currentBalance = this.state.balance;
        this.checkBalance.then((newBalance) => {
          this.showToast(`Congratulations you just won ${ (newBalance - currentBalance) } CHROMA`); // não esquecer de fazer os cálculos dos profits
        })
      }
    });
    this.checkBalance();
  }

  betsCountdown = () => {     
    const serverDateTime = new Date(this.state.nextSpin*1000);
    const userDateTime = new Date();
    serverDateTime.setSeconds(0);

    let _timeDiff = serverDateTime.getTime()  - userDateTime.getTime();
    let mins = Math.floor((_timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    let secs = Math.floor((_timeDiff % (1000 * 60)) / 1000);
    if(mins>1) {
     this.setState({timeRemaining : `${mins} minutes ${secs} seconds`});
    } else if(mins===1) {
     this.setState({timeRemaining : `${mins} minute ${secs} seconds`});
    } else {
      if(secs>5) {
       this.setState({timeRemaining : `${secs} seconds`});
     } else {
        this.setState({timeRemaining : `closing...`});
      }
    }
}

  checkBalance = () => {
    return this.state.contract.methods.checkBalance().call({from:this.state.account}).then(balance => {
      balance = Web3.utils.fromWei(balance.toString(), 'ether');
      this.state.contract.methods.maxBet().call({from:this.state.contract.address}).then(mBet => {
        let casinoMaxBet = Web3.utils.fromWei(mBet.toString(), 'ether');
        this.setState( { balance : balance.toString(), maxBet : casinoMaxBet });
      });
      return balance;
    });
  }

  addToHistory = (number) => {
    let _pastwinnings = this.state.pastWinnings;
    _pastwinnings.unshift(`${number} ${(number!=0) ? this.winningNumbers[number].color : ''}`);
    if(_pastwinnings.length>10) {
      _pastwinnings.splice();
    }
    this.setState({pastWinnings: _pastwinnings});
  }
  
  // ===========================================
  // BALL

  ballInit() { 
    const load = () => {
      const element = this.ball.current;
      let _ballUpdateBox = this.ballUpdateBox;
      this.tweenerBall = new TWEEN.Tween( element.dataset )
						.to( { rotation: 360, center: 160 }, 1000 )
						.repeat( Infinity )
						.onUpdate( function() {
              _ballUpdateBox( element, this );
            })
						.start();

    }
    const animate = ( time ) => {
      requestAnimationFrame( animate );
      TWEEN.update( time );
    }
    load();
    animate();    
  }

  ballUpdateBox = ( box, params ) => {
    box.style.transform = `translateX(${ Math.floor( params._object.center ) }px) rotate(${ Math.floor( params._object.rotation ) }deg)`;
    box.style.transformOrigin = `-${ (Math.floor( params._object.center ) - 8) }px center`;
  }

  ballReset() {
    TWEEN.removeAll();

    this.ball.current.style.transform = `translateX(160px) rotate(0deg)`;
    this.ball.current.style.transformOrigin = `-152px center`;
    this.ball.current.dataset.rotation = 0;
    this.ball.current.dataset.center = 160;

    setTimeout(() => { this.ballInit() },100);
  }

  ballToNumber(number) {
    const element = this.ball.current;
    let houses = [0,23,6,35,4,19,10,31,16,27,18,14,33,12,25,2,21,8,29,3,24,5,28,17,20,7,36,11,32,30,15,26,1,22,9,34,13];
    let finalPosition = 720 + ((360 / 37) * houses[number]);
    let _ballUpdateBox = this.ballUpdateBox;
    let tweener3 = new TWEEN.Tween( element.dataset )
      .to( { rotation: finalPosition, center: 88 }, (2000 + (2000 - ((finalPosition * 2000) / 720))))
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate( function() {
        _ballUpdateBox( element, this );
      });
      this.tweenerBall.repeat(1);
      this.tweenerBall.chain(tweener3);
    
      this.showRoulleteResult(number);
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
  // BOOK

  openBook = () => {
    this.setState({isBookOpen: true});
    let _audio = new Audio('/sounds/book-open.wav');
    _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
    _audio.play();
  }
  closeBook = () => {
    this.setState({isBookOpen: false});
    let _audio = new Audio('/sounds/book-close.wav');
    _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
    _audio.play();
  }

  // ===========================================
  // STATUS SCREENS

  noMoreBets = () => {
    this.setState({awaitingResult: true});
  }
  betsAllowed = () => {
    this.setState({awaitingResult: false});
  }
  showRoulleteResult = (number) => {
    let _audio = new Audio(`/sounds/number-${number}.mp3`);
    _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
    _audio.play();
  }


  // ===========================================
  // OTHER

  updateTotal = () => {
    var total = 0;
    for(var a=0; a<this.state.placedBets.length; a++) {
      total += Number(this.state.placedBets[a].chroma_value);
    }
    this.setState({canBet: (!(total > this.state.maxBet) && !(total > this.state.balance)), totalPlacedBetsChroma: total, maxBetAchieved: (total > this.state.maxBet) });
  }

  addBalance = (value, button) => {
    this.setStatusBarText('Sending request for approval...',0);
      let wei = Web3.utils.toWei(value.toString());
      this.setStatusBarText('Waiting for blockchain validation...',0);
      this.state.chromaContract.methods.approve(this.state.address, wei).send({ from: this.state.account }).then(() => {
          button.target.disabled = true;
          button.target.textContent = 'adding...';
          this.state.contract.methods.addBalance(wei).send({ from: this.state.account}).then(() => {
            this.setStatusBarText('Balance added successfully.',1);
            button.target.disabled = false;
            button.target.textContent = 'Deposit';

            this.checkBalance();
          });
        });
      }

  removeBalance = (value) => {
    if(this.state.canBet && !this.state.awaitingResult) {
      const _value = (value/100)*this.state.balance;
      let wei = Web3.utils.toWei(_value.toString(),'Ether');
      this.state.contract.methods.Withdraw(wei).send({from: this.state.account});
    }
  }

  placeBets = () => {
    this.setStatusBarText('Placing bet...',0);
    this.noMoreBets();
    this.state.contract.methods.betting(this.state.placedBets).send( { from: this.state.account, gas: (1000000 * this.state.placedBets.length)}).then((result) => {
      if(this.state.devMode) console.info("Place Bets", result);
      this.checkBalance();
    }).catch((error) => {
      if(this.state.devMode) console.error("Place Bets", error);
      this.showToast("The transaction was stopped by your request.");
      this.betsAllowed();
    });
  }

  clearBets = () => {
    if(!this.state.awaitingResult) {
      let _audio = new Audio('/sounds/clear-bets.wav');
      _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
      _audio.play();

      this.setState({placedBets: []}, () => {
        this.updateTotal();
      });
    }
  }

  boardHouseMiddleClick = (type, value) => {
    if(!this.state.awaitingResult) {
      let _placedBets = this.state.placedBets;
      for(var i=0; i<_placedBets.length; i++) {
        if(_placedBets[i].bet_type === type && _placedBets[i].bet_num === value) {
          _placedBets.splice(i,1);
          this.setState({placedBets: _placedBets});
        }
      }
      this.updateTotal();
    }
  }

  boardHouseClick = (type, value) => {
    if(this.state.canBet && !this.state.awaitingResult) {
      let wei = Web3.utils.toWei(this.state.amount.toString(),'Ether');

      let hasBeenAdded = false;
      let _placedBets = this.state.placedBets;
      for(var i=0; i<_placedBets.length; i++) {
        if(_placedBets[i].bet_type === type && _placedBets[i].bet_num === value) {
          _placedBets[i].amount = window.BigInt(Number(_placedBets[i].amount) + Number(wei)).toString();
          _placedBets[i].chroma_value += this.state.amount;
          hasBeenAdded = true;
          this.setState({placedBets: _placedBets});
          let _audio = new Audio('/sounds/number-click-more.wav');
          _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
          _audio.play();
        }
      }
      if(!hasBeenAdded) {
        this.state.placedBets.push({
          bet_type: type,
          bet_num: value,
          amount: wei,
          chroma_value: this.state.amount
        });
        let _audio = new Audio('/sounds/number-click-empty.wav');
          _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
          _audio.play();
      }
      this.setState({betType: parseInt(type), betNum: parseInt(value)}, () => {
        this.updateTotal();
      });
    }
  }

  

  chipClick = (value, color) => {
    this.setState({amount: parseInt(value), activeChip: color});
    let _audio = new Audio('/sounds/chip-click.wav');
    _audio.volume = (this.state.soundEffectsEnabled) ? 0.5 : 0;
    _audio.play();
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
    if(this.state.account && this.state.web3) return true;
    return false;
  }

  deleteBet = (index) => {
    this.state.placedBets.splice(index, 1);
    this.setState({placedBets: this.state.placedBets}, () => {
      this.updateTotal();
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
    var boardHousesButtons = Object.keys(_boardHouses).map((key, i) => 
      <BoardHouse
        placedBets={this.state.placedBets}
        key={i}
        type={key}
        winningNumber={this.state.spinResult}
        canBet={this.state.canBet}
        onHouseMiddleClick={this.boardHouseMiddleClick}
        onHouseClick={this.boardHouseClick} />
    );

    var chipButtons = Object.keys(ChipsEnum).map((key, i) => 
      <Chip
        key={i}
        type={key}
        onChipClick={this.chipClick}
        activeAmount={this.state.amount} />
    );

    return (
      <div className="App">
        <CwiHistory pastWinnings={this.state.pastWinnings} />
        <CwiBook
          placedBets={this.state.placedBets}
          deleteCallback={this.deleteBet}
          closeCallback={this.closeBook}
          isVisible={this.state.isBookOpen}
          maxBet={this.state.maxBet} />

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

        <div className="cwi-roulette">
          <div className="cwi-roulette__wheel" >
            <div className="cwi-roulette__ball" ref={this.ball} data-rotation="0" data-center="160"/>
          </div>
          <div className="cwi-roulette__cover" />
          <div className="cwi-roulette__handle" />
          <div className="cwi-roulette__pin" />
        </div>

        <div className="cwi-timeRemaining">
          <strong>Time Remaining</strong>
          <div> { this.state.timeRemaining } </div>
        </div>

        { (this.state.spinResult) ?
        <div className={ `cwi-winningNumber is-${ this.winningNumbers[parseInt(this.state.spinResult)].color}` }>
          <span>{ this.state.spinResult } { (this.state.spinResult!=0) ? <small>{ this.winningNumbers[parseInt(this.state.spinResult)].color }</small> : null }</span>
        </div>
        : null }
      
        <div className="table">
        <button onClick={this.clearBets} className="cwi-clear-btn" disabled={ this.state.awaitingResult || this.state.placedBets.length===0 }>Clear Bets</button>
        <button onClick={this.openBook} className="cwi-book-btn" disabled={ this.state.awaitingResult }>Open Book</button>
          <div className="cwi-info">
            <div className="cwi-info__balance">
              <strong>Balance</strong>
              <br />
              {(this.isAbleToPlay()) ? 
                <div>
                  { this.state.balance } <small>Chroma</small>
                </div>
              :
                <div>Connect your wallet to start betting<br /><br />
                  <button onClick={this.requestAccountConnect} className="cwi-connect-play-btn">Connect Wallet</button>
                </div>
              }
            </div>

            <div className="cwi-info__max-bet">
              <strong>Max bet</strong>
              <br />
              { this.state.maxBet } <small>Chroma</small>
            </div>

            <div className="cwi-info__placed-bets">
              <strong>Current bet</strong>
              <br />
              { this.state.totalPlacedBetsChroma } <small>Chroma</small> { (this.state.maxBetAchieved) ?  <div className="cwi-info__placed-bets-max">Can't bet more than { this.state.maxBet } Chroma</div> : null }
            </div>
          </div>
          {(this.isAbleToPlay()) ? 
            <div className={`cwi-spin-wheel ${(this.state.canBet && !this.state.awaitingResult) ? ' animate' : ''}`}>
            <button type="button" className="cwi-spin-wheel__btn" onClick={this.placeBets} disabled={!this.state.canBet || this.state.awaitingResult}>Place Bets</button>
          </div>
          : null }
          <div className={`cwi-board cursor-${this.state.activeChip}`} id="cwiBoard">
            { boardHousesButtons }          
          </div>
          <div id="cwi-chiplist" className="cwi-chips" ref={this.chips}>
            { chipButtons }
          </div>
        </div>
        { (this.state.awaitingResult) ?
        <div className="cwi-nomorebets">No more bets...</div>
        : null }

        { (this.state.toastMessage) ?
          <div className="cwi-toast"><span>{ this.state.toastMessage }</span></div>
        : null }
        { (this.state.statusBar.text) ? 
        <div className={`cwi-status-bar ${(this.state.statusBar.color === 1) ? ' cwi-status-bar--red' : 'cwi-status-bar--black'}`}>{ this.state.statusBar.text }</div>
        : null }
      </div>
    );
  }


}

export default App;
