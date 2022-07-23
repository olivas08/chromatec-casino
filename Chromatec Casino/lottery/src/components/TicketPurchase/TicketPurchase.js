import React from 'react';
import './TicketPurchase.css';

class TicketPurchase extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      handTicketInput: {},
      handleTicketCount: {},
      buyTicket: {},
      ticketIncreaseCount: {},
      ticketDecreaseCount: {}
    };
  }

  handTicketInput = () => {
    this.props.handTicketInput()
  }

  handleTicketCount = () => {
    this.props.handleTicketCount()
  }

  buyTicket = (button) => {
    this.props.buyTicket(button)
  }

  ticketIncreaseCount = () => {
    this.props.ticketIncreaseCount()
  }

  ticketDecreaseCount = () => {
    this.props.ticketDecreaseCount()
  }

  render() {

    return (
      <div className="cwi-buy-tickets">
        <div className="cwi-buy-tickets__quantity">
          <input type="number" min="1" max={ this.props.ticketBuyLimit } required value={ this.props.buyTicketCount } onChange={ this.handleTicketCount } onInput={ this.handTicketInput } />
          <div className="cwi-buy-tickets__quantity-buttons">
            <button className="cwi-buy-tickets__quantity-increase" onClick={ this.ticketIncreaseCount } />
            <button className="cwi-buy-tickets__quantity-decrease" onClick={ this.ticketDecreaseCount } />
          </div>
        </div>

        <div className={`cwi-buy-tickets__animation ${(!this.props.awaitingResult && this.props.isAbleToPlay) ? ' animate' : ''}`}>
          <button type="button" className="cwi-buy-tickets__btn" onClick={ this.buyTicket } disabled={( this.props.awaitingResult || !this.props.isAbleToPlay )}>Buy Tickets</button>
        </div>

        <div className="cwi-buy-tickets__cost">
          { this.props.ticketTotalPrice } Chroma
        </div>

      </div>
    );
  }
}

export default TicketPurchase;