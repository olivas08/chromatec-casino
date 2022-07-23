import React from 'react';
import './TimeRemaining.css';

class TimeRemaining extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      timeRemaining: <div><span>00</span>:<span>00</span><span className="seconds">:00</span></div>
    };
    this.tickerTimer = null;
  }

  componentDidMount = async () => {
    this.tickerTimer = setInterval(this.tickerEvent, 1000);
  }

  componentDidUpdate = () => {
    clearInterval(this.tickerTimer);
    this.tickerTimer = setInterval(this.tickerEvent, 1000);
  }
  componentWillUnmount = () => {
    clearInterval(this.tickerTimer);
  }

  tickerEvent = () => {
    const serverDateTime = new Date(this.props.date*1000);
    const userDateTime = new Date();

    let finalDate = serverDateTime.getTime() - userDateTime.getTime();

    let msec = finalDate;
    var hh = Math.floor(msec / 1000 / 60 / 60);
    msec -= hh * 1000 * 60 * 60;
    var mm = Math.floor(msec / 1000 / 60);
    msec -= mm * 1000 * 60;
    var ss = Math.floor(msec / 1000);

    if (this.props.boughtTicketCount>0) {
      if (userDateTime <= serverDateTime) {
        this.setState({ timeRemaining: <div>
          <span>{ (hh<10) ? '0' + hh : hh }</span>:
          <span>{ (mm<10) ? '0' + mm : mm }</span>
          <span className="seconds">:{ (ss<10) ? '0' + ss : ss }</span></div> });
      } else {
        this.setState({ timeRemaining: <div>closed...</div> });
      }
    } else {
      this.setState({ timeRemaining: <div>Be the first to buy a ticket</div> });
    }

  };

  render() {
    const _winningDate = new Date(this.props.date*1000);
    const dateOfAnnouncement = `${ (_winningDate.getHours()<10) ? '0'+_winningDate.getHours() : _winningDate.getHours() }:${ (_winningDate.getMinutes()<10) ? ('0'+_winningDate.getMinutes()) : _winningDate.getMinutes()}:${ (_winningDate.getSeconds()<10) ? ('0'+_winningDate.getSeconds()) : _winningDate.getSeconds() }`;
   
    return (
      <div className="cwi-time-remaining">
          <strong>Time Remaining</strong>
          { (this.props.date) ?
            <div className="cwi-time-remaining__time">{ this.state.timeRemaining }</div>
          : 
            <div className="cwi-time-remaining__time"><div><span>00</span>:<span>00</span><span className="seconds">:00</span></div></div>
          }
          { (this.props.date) ?
            <div className="cwi-time-remaining__date">Winner announced at { dateOfAnnouncement }</div>
          : null }
        </div>
    );
  }

}

export default TimeRemaining;