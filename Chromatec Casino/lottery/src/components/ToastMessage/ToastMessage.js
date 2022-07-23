import React from 'react';
import PropTypes from 'prop-types';
import './ToastMessage.css';

const ToastMessage = ({message}) => {

    
    if(message) {
        return (
          <div className="cwi-toast"><span>{ message }</span></div>
        );
    }
    else {
        return null;
    }
}

ToastMessage.propTypes = {
    message: PropTypes.string
  };

export default ToastMessage;