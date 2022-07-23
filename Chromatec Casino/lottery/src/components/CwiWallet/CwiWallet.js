import React from 'react';
import './CwiWallet.css';

class CwiWallet extends React.Component {
    constructor(props) {
        super(props);
        this.depositAmount = React.createRef();
        this.withdrawAmount = React.createRef();
        this.state = {
            isVisible: false,
            addBalanceEvent: {},
            removeBalanceEvent: {},
            withdrawAmountValue: 0
        };
    }

    toggle = () => {
        this.setState({ isVisible: !this.state.isVisible })
    }

    onAddBalance = (e) => {
        this.props.addBalanceEvent(this.depositAmount.current.value, e)
    }

    onRemoveBalance = () => {
        this.props.removeBalanceEvent(this.withdrawAmount.current.value)
    }

    getBalance = () => {
        return Math.round((parseFloat(this.props.balance || 0) + Number.EPSILON) * 100) / 100;
    }

    getAccountHash = () => {
        let str = this.props.wallet;
        return str.substr(0, 6) + '...' + str.substr(str.length-4, str.length);
    }

    widthdrawEvent = (e) => {
        this.setState( { withdrawAmountValue: ((e.target.value * this.getBalance()) / 100)});
    }
        
    render() {
        let popover;
        if(this.state.isVisible) {
            popover = <div className="cwi-wallet__popover">
                <div className="cwi-wallet__account">
                    <div className="cwi-wallet__account-avatar"><img src={`https://avatars.dicebear.com/api/jdenticon/${this.getAccountHash()}.svg`} alt="" /></div>
                    <div title={this.props.wallet} className="cwi-wallet__account-contract">{ this.getAccountHash() }</div>
                    <div> { this.props.balance }</div>
                </div>
            </div>;
        }
        return (
            <div className="cwi-wallet">
                <button type="button" className="cwi-wallet__toggle" onClick={this.toggle}>My Wallet</button>
                { popover }
            </div>
            );
        }
}

export default CwiWallet;