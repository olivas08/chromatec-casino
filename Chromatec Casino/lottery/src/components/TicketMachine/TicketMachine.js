import React from 'react';
import './TicketMachine.css';

class TicketMachine extends React.Component {
  render() {
    var renderTickets = [];
    const _ticketRenderLimit = (this.props.ticketCount>4) ? 4 : this.props.ticketCount;
    for (var i = 0; i < _ticketRenderLimit; i++) {
      renderTickets.push(<div key={i} className="cwi-ticket-machine__tickets-ticket"></div>);
    }

    return (
      <div className="cwi-ticket-machine">
        <div className="cwi-ticket-machine__hole" />
        <div className="cwi-ticket-machine__count">
          { this.props.ticketCount } &times;
        </div>
        <div className="cwi-ticket-machine__tickets">
          { renderTickets }
        </div>
      </div>
    );
  }
}

export default TicketMachine;