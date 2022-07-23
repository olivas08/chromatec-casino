import React from 'react';
import './WonTotal.css';

class WonTotal extends React.Component {

  abbrNum(number, decPlaces) {
    decPlaces = Math.pow(10,decPlaces);
    var abbrev = [ "k", "m", "b", "t" ];
    for (var i=abbrev.length-1; i>=0; i--) {
      var size = Math.pow(10,(i+1)*3);
      if(size <= number) {
        number = Math.round(number*decPlaces/size)/decPlaces;
        if((number === 1000) && (i < abbrev.length - 1)) {
          number = 1;
          i++;
        }
        number += abbrev[i];
        break;
      }
    }
    return number;
  }

  render() {
    return (
      <div className="cwi-won-total">
        <strong>You won a total of</strong>
        <div>{ this.abbrNum(this.props.value,1) } Chroma</div>
      </div>
    );
  }

}

export default WonTotal;