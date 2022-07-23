import React from 'react';
import PropTypes from 'prop-types';
import './CwiHistory.css';

const CwiHistory = ({pastWinnings}) => {

    var bets = Object.keys(pastWinnings).map((key, i) => {
        let _temp;
        _temp = <div className="cwi-history__entry" key={i}>{ pastWinnings[i] }</div>
        return _temp;
    });



    return (
        <div className="cwi-history">
            <div className="cwi-history__list">
                { bets }
            </div>
        </div>
    );

}

CwiHistory.propTypes = {
    pastWinnings: PropTypes.any
  };

export default CwiHistory;