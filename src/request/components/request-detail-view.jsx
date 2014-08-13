require('../stores/request-detail-store.js');

var glimpse = require('glimpse'),
    React = require('react'),
    entryList = require('./request-detail-list-view.jsx');

function getState(allSummaries) {
    return {
        allSummaries: allSummaries || []
    };
}

module.exports = React.createClass({
    getInitialState: function() {
        return getState();
    },
    // TODO: Get rid of this boiler plate code via a mixin
    componentDidMount: function() {
        this._entryChangedOn = glimpse.on('shell.request.summary.changed', this._entryChanged);
    },
    componentWillUnmount: function() {
        glimpse.off(this._entryChangedOn);
    },
    render: function() {
        return (
            <div className="request-detail-holder">
                <h2>Request</h2>
                <entryList allSummaries={this.state.allSummaries} />
            </div>
        );
    },
    _entryChanged: function(allSummaries) {
        this.setState(getState(allSummaries));
    }
});
