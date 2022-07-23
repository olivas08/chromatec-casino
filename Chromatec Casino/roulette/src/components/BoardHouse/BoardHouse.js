import React from 'react';
import PropTypes from 'prop-types';
import './BoardHouse.css';
import { _boardHouses } from './BoardHouse.enums';


const BoardHouse = ({type, onHouseClick, onHouseMiddleClick, placedBets, canBet, winningNumber}) => {
    
    const handleClick = (event) => {
        if(event.button===0) {
            onHouseClick(_boardHouses[type].type, _boardHouses[type].number);
        }
        if(event.button===1) {
            onHouseMiddleClick(_boardHouses[type].type, _boardHouses[type].number);
        }
    }

    let total = 0;
    let bets;
    if(placedBets.length > 0) {
        for(var i=0; i<placedBets.length; i++) {
            if(placedBets[i].bet_num === _boardHouses[type].number && placedBets[i].bet_type === _boardHouses[type].type) {
                total += placedBets[i].chroma_value;
                if(placedBets[i].chroma_value >= 1000000) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--black" />
                }
                else if(placedBets[i].chroma_value >= 50000) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--indigo" />
                }
                else if(placedBets[i].chroma_value >= 20000) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--purple" />
                }
                else if(placedBets[i].chroma_value >= 5000) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--blue" />
                }
                else if(placedBets[i].chroma_value >= 1000) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--red" />
                }
                else if(placedBets[i].chroma_value >= 500) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--emerald" />
                }
                else if(placedBets[i].chroma_value >= 200) {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--green" />
                }
                else {
                    bets = <div className="cwi-board-house__pin cwi-board-house__pin--yellow" />
                }
            }
        }
    }
        
    return (
        <button className={`cwi-board-house cwi-board-house-${_boardHouses[type].class} ${(!canBet) ? 'cursor-cant-bet' : ''} ${(winningNumber===_boardHouses[type].class) ? 'cwi-board-house--winner' : ''}`} onMouseDown={handleClick}>
            { bets }
            { (total>0) ? <div className="cwi-board-house__tooltip">{ total } Chroma</div> : null }
            { (winningNumber===_boardHouses[type].class) ?
                <div className="cwi-board-house__winner" />
            : null }
        </button>
    );
}

BoardHouse.propTypes = {
    type: PropTypes.string,
    onHouseClick: PropTypes.func,
    onHouseMiddleClick: PropTypes.func,
    placedBets: PropTypes.any,
    canBet: PropTypes.bool,
    winningNumber: PropTypes.string
  };

export default BoardHouse;