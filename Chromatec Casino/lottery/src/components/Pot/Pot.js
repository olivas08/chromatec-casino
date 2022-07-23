import React from 'react';
import './Pot.css';

class Pot extends React.Component {
  abbrNum(number, decPlaces) {
    // 2 decimal places => 100, 3 => 1000, etc
    decPlaces = Math.pow(10,decPlaces);

    // Enumerate number abbreviations
    var abbrev = [ " thousand", " million", " billion", " trillion" ];

    // Go through the array backwards, so we do the largest first
    for (var i=abbrev.length-1; i>=0; i--) {

        // Convert array index to "1000", "1000000", etc
        var size = Math.pow(10,(i+1)*3);

        // If the number is bigger or equal do the abbreviation
        if(size <= number) {
             // Here, we multiply by decPlaces, round, and then divide by decPlaces.
             // This gives us nice rounding to a particular decimal place.
             number = Math.round(number*decPlaces/size)/decPlaces;

             // Handle special case where we round up to the next abbreviation
             if((number === 1000) && (i < abbrev.length - 1)) {
                 number = 1;
                 i++;
             }

             // Add the letter for the abbreviation
             number += abbrev[i];

             // We are done... stop
             break;
        }
    }

    return number;
  }

  

  render() {
    let potSize;
    
    if(this.props.total>=1000000000) {
      potSize =  `cwi-pot--b`;
    }
    else if(this.props.total>=1000000) {
      potSize =  `cwi-pot--m`;
    } 
    else if(this.props.total>=1) {
      potSize =  `cwi-pot--k`;
    } 

    return (
      <div className={`cwi-pot ${ potSize }`}>
        { (this.props.total > 0) ?
          <div className="cwi-pot__total-title">{ this.abbrNum(parseInt(this.props.total), 1) } chromas to win</div>
        : null }
        { (this.props.total > 0) ?
          <div className="cwi-pot__total-value">{ this.props.total }</div>
        : null }
        <div className="cwi-pot__box-back" />
        <div className="cwi-pot__box-chips" />
        <div className="cwi-pot__box-front" />
      </div>
    );
  }

}

export default Pot;