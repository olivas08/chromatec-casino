import React from 'react';
import PropTypes from 'prop-types';
import './StatusBar.css';

const StatusBar = ({text}) => {

    
    if(text) {
        return (
            <div className="cwi-status-bar">
            { text }
          </div>
        );
    }
    else {
        return null;
    }
}

StatusBar.propTypes = {
    text: PropTypes.string
  };

export default StatusBar;