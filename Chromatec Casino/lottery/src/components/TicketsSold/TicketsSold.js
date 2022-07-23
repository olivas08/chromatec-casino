import React from 'react';
import './TicketsSold.css';

class TicketsSold extends React.Component {
  render() {
    return (
      <div className="cwi-tickets-sold">
        <strong>Total tickets sold</strong>
        <div>{ this.props.tickets }</div>
      </div>
    );
  }

}

export default TicketsSold;