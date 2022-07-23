import React from 'react';
import PropTypes from 'prop-types';
import './Chip.css';
import { ChipsEnum } from './Chip.enums';

const Chip = ({type, onChipClick, activeAmount}) => {
    const handleClick = () => {
        onChipClick(ChipsEnum[type].value, ChipsEnum[type].color);
    }
        return (
            <button className={`cwi-chip cwi-chip--${ChipsEnum[type].color}${(activeAmount === ChipsEnum[type].value) ? ' cwi-chip--selected' : ''}`} onClick={handleClick}>{ChipsEnum[type].label}</button>
        );
}

Chip.propTypes = {
    type: PropTypes.string,
    onChipClick: PropTypes.func,
    activeAmount: PropTypes.number
  };

export default Chip;