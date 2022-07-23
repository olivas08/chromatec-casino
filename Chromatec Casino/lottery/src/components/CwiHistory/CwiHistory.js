import React from 'react';
import './CwiHistory.css';

class CwiHistory extends React.Component {

    render() {

        const _date = new Date(this.props.date*1000);
        let localeSpecificTime = _date.toLocaleTimeString();
        localeSpecificTime = localeSpecificTime.replace(/:\d+ /, ' ');

        let _account = this.props.account;
        if(_account) {
            _account = _account.substr(0, 6) + '...' + _account.substr(_account.length-4, _account.length);
        }

        return (
            <div className="cwi-history">
                <div className="cwi-history__content">
                    <label>Last Winner</label>
                    <div className="cwi-history__account">{ _account }</div>
                    <div className="cwi-history__date">{ localeSpecificTime }</div>
                </div>
            </div>
        );
    }

}

export default CwiHistory;