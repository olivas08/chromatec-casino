import React from 'react';
import PropTypes from 'prop-types';
import './CwiBook.css';
import { _boardHouses } from '../BoardHouse/BoardHouse.enums';

const CwiBook = ({placedBets, deleteCallback, closeCallback, isVisible}) => {
    const handleClick = (e) => {
        deleteCallback(e);
    }
    
    var total = 0;
    var bets = Object.keys(placedBets).map((key, i) => {
        return Object.keys(_boardHouses).map((keya, a) => {
            let _temp;
            if(_boardHouses[keya].number === placedBets[i].bet_num && _boardHouses[keya].type === placedBets[i].bet_type) {
                _temp = <div className="cwi-book__entry" key={i}><div className="cwi-book__entry-house">{ _boardHouses[keya].label }</div><div className="cwi-book__entry-value">{ placedBets[i].chroma_value } Chromas</div><button className="cwi-book__entry-delete" onClick={() => handleClick(i)}>&times;</button></div>
                total += Number(placedBets[i].chroma_value);
            }
            return _temp;
        });
    });

    const close = () => {
        closeCallback();
    }

    if(isVisible) {
        return (
            <div className="cwi-book">
                <div className="cwi-book__header">
                    <div className="cwi-book__header-title">Order Book</div>
                    <button className="cwi-book__header-close" onClick={close}>&times;</button>
                </div>
                <div className="cwi-book__list">
                    { bets }
                </div>
                <div className="cwi-book__footer">
                    <div className="cwi-book__footer-label"><strong>TOTAL</strong></div>
                    <div className="cwi-book__footer-total"><strong>{ total } Chromas</strong></div>
                </div>
            </div>
        );
    }
    else {
        return null;
    }
}

CwiBook.propTypes = {
    isVisible: PropTypes.bool,
    placedBets: PropTypes.any,
    deleteCallback: PropTypes.func,
    closeCallback: PropTypes.func
  };

export default CwiBook;