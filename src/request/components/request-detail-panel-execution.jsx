'use strict';

var messageProcessor = require('../util/request-message-processor');

var _ = require('lodash');
var React = require('react');
var Highlight = require('react-highlight');
var classNames = require('classnames');

var getPayloads = (function() {
    var getItem = messageProcessor.getTypePayloadItem;
    
    var options = {
        'end-request': getItem,
        'begin-request': getItem,
        'action-content': getItem,
        'action-route': getItem,
        'after-action-invoked': getItem,
        'action-view-found': getItem,
        'after-action-view-invoked': getItem
    };
		
    return function(request) {
		return messageProcessor.getTypeStucture(request, options); 
    }
})();

var getMessages = (function() {
    var getItem = messageProcessor.getTypeMessageItem;
    var getList = messageProcessor.getTypeMessageList;
    
    var options = {
        'end-request': getItem,
        'begin-request': getItem,
        'before-action-invoked': getItem,
        'after-action-invoked': getItem,
        'before-execute-command': getList,
        'after-execute-command': getList,
        'before-view-component': getList,
        'after-view-component': getList,
        'after-action-result': getItem
    };
		
    return function(request) {
		return messageProcessor.getTypeStucture(request, options); 
    }
})();

var RequestHeaders = React.createClass({
    render: function() {
        return (
            <div>
                <div className="tab-section">{this.props.title}</div>
                <div className="tab-section tab-section-execution-headers">
                    <div className="flex flex-row flex-inherit tab-section-header">
                        <div className="tab-title col-2">Variable</div>
                        <div className="tab-title col-8">Value</div>
                    </div>
                    <div className="tab-section-boxing tab-section-listing">
                        {_.map(this.props.headers, function(value, key) {
                            return (<section className="flex flex-row">
                                    <div className="col-2">{key}</div>
                                    <div className="col-8">{value}</div>
                                </section>);
                        })}
                    </div>
                </div>
            </div>
        );
    }
});

var CommandItem = React.createClass({
    getInitialState: function() {
        return { show: false };
    },
    onClick: function() {
        this.setState({ show: !this.state.show });
    },
    render: function() {
        var beforeCommand = this.props.beforeCommand;
        var afterCommand = this.props.afterCommand;
            
        var showText = this.state.show ? 'close' : 'open';
        var containerClass = classNames({
                'tab-section-execution-command-text': true,
                'tab-execution-hidden': !this.state.show,
                'pre-open': this.state.show
            });
        // NOTE: this was a way I tried to do correlation but it doesn't work really well
        //var duration = (afterCommand.ordinal == beforeCommand.ordinal + 1) ? afterCommand.payload.commandDuration : '--';
        var duration = afterCommand.payload.commandDuration;
        var nesting = this.props.isRoot ? null : <span className="tab-execution-timing-arrow">➦</span>;
            
        var content = (
                <div className="tab-section-execution-command-item">
                    <div className="tab-section-execution-command-item-detail">
                        <div className="col-8">{beforeCommand.payload.commandMethod} <span className="tab-section-execution-command-isAsync text-minor" title="Is Async">{(beforeCommand.payload.commandIsAsync ? 'async' : '')}</span><span className="tab-section-execution-command-open" onClick={this.onClick}>[{showText}]</span></div>
                        <div className="tab-execution-timing col-2">{duration} ms{nesting}</div>
                    </div>
                    <div className={containerClass} onClick={this.onClick}>
                        <Highlight className="sql">
                            {beforeCommand.payload.commandText}
                        </Highlight>
                        <div className="tab-execution-hidden-gradient"></div>
                    </div>
                </div>
            );
    
        return content;
    }
});

var CommandList = React.createClass({
    render: function() {
        var beginMessage = this.props.beginMessage;
        var endMessage = this.props.endMessage;
        var beforeExecuteCommandMessages = this.props.beforeExecuteCommandMessages;
        var afterExecuteCommandMessages = this.props.afterExecuteCommandMessages;
        
        var content = null;
        if (beginMessage && endMessage && beforeExecuteCommandMessages && afterExecuteCommandMessages) {
            var commandItems = [];
            for (var i = 0; i < beforeExecuteCommandMessages.length; i++) {
                var beforeCommand = beforeExecuteCommandMessages[i];
                var afterCommand = afterExecuteCommandMessages[i];
                if (beforeCommand.ordinal > beginMessage.ordinal && afterCommand.ordinal < endMessage.ordinal) {
                    commandItems.push(<CommandItem key={beforeExecuteCommandMessages[i].id} beforeCommand={beforeCommand} afterCommand={afterCommand} isRoot={this.props.isRoot} />);
                }
            }
            
            // process action
            if (commandItems.length > 0) {
                content = (
                        <div className="tab-section tab-section-execution-command">
                            <div className="flex flex-row flex-inherit tab-section-header">
                                <div className="tab-title col-9">SQL Query</div>
                            </div>
                            <div className="tab-section-boxing">
                                <section className="flex flex-row flex-inherit flex-base tab-section-item">
                                    <div className="tab-section-execution-command-items col-9">{commandItems}</div>
                                </section>
                            </div>
                        </div>
                    ); 
            }
        }
        
        return content;
    }
});

var ParamaterList = React.createClass({
    render: function() {
        var argumentData = this.props.argumentData;
        
        var content = null;
        if (argumentData) { 
            content = _.map(argumentData, function(item, i) {
                var value = '';
                if (item.value) {
                    if (typeof item.value == 'string') {
                        if (item.value == item.typeFullName) {
                            value = <span>= <span className="hljs-doctag">{'{'}object{'}'}</span></span>;
                        }
                        else {
                            value = <span>= <span className="hljs-string">"{item.value}"</span></span>;
                        }
                    }
                    else if (typeof item.value == 'boolean') {
                        value = <span>= <span className="hljs-keyword">{item.value.toString()}</span></span>;
                    }
                    else {
                        value = <span>= <span className="hljs-number">{item.value}</span></span>;
                    }
                }
                
                return <li key={i}><span className="hljs-keyword">{item.type}</span> <span className="hljs-params">{item.name}</span> {value}</li>;
            });
            
            content = <ul className="paramater-list">{content}</ul>
        }
        
        return content;
    }
});


module.exports = React.createClass({
    getInitialState: function () {
        return { checkedState: false };
    },
    render: function () {
        var request = this.props.request;
        
        // get payloads 
        var payload = getPayloads(request);
        var beginRequestPayload = payload.beginRequest;
        var endRequestPayload = payload.endRequest;
        var routePayload = payload.actionRoute;
        var contentPayload = payload.actionContent;
        var afterActionInvokedPayload = payload.afterActionInvoked;
        var actionViewFoundPayload = payload.actionViewFound;
        var afterActionViewInvokedPayload = payload.afterActionViewInvoked;
        
        var content = null;
        if (routePayload || afterActionInvokedPayload || actionViewFoundPayload || afterActionViewInvokedPayload) {
            // get messages 
            var message = getMessages(request);
            var beginRequestMessage = message.beginRequest;
            var endRequestMessage = message.endRequest;
            var beforeActionInvokedMessage = message.beforeActionInvoked;
            var afterActionInvokedMessage = message.afterActionInvoked;
            var beforeExecuteCommandMessages = message.beforeExecuteCommand;
            var afterExecuteCommandMessages = message.afterExecuteCommand;
            var beforeViewComponentMessages = message.beforeViewComponent;
            var afterViewComponentMessages = message.afterViewComponent;
            var afterActionResultMessage = message.afterActionResult;
            if (beforeExecuteCommandMessages && afterExecuteCommandMessages) {
                beforeExecuteCommandMessages = beforeExecuteCommandMessages.sort(function(a, b) { return a.ordinal - b.ordinal; });
                afterExecuteCommandMessages = afterExecuteCommandMessages.sort(function(a, b) { return a.ordinal - b.ordinal; });
            }
            
            //process pre action commands
            var preCommands = null;
            if (beginRequestMessage && beforeActionInvokedMessage) { 
                preCommands = <CommandList beforeExecuteCommandMessages={beforeExecuteCommandMessages} afterExecuteCommandMessages={afterExecuteCommandMessages} beginMessage={beginRequestMessage} endMessage={beforeActionInvokedMessage} isRoot={true} />            
            }
            
            // process route
            var route = null;
            if (routePayload) {
                var routePath = beginRequestPayload ? (<span><span>{beginRequestPayload.requestPath}</span><span>{beginRequestPayload.requestQueryString}</span></span>) : '';
            
                route = (
                        <div className="tab-section tab-section-execution-route">
                            <div className="flex flex-row flex-inherit tab-section-header">
                                <div className="tab-title col-9">Route</div>
                            </div>
                            <div className="tab-section-boxing">
                                <section className="flex flex-row flex-inherit flex-base tab-section-item">
                                    <div className="col-2">{routePayload.routeName} - {routePath} &nbsp; <span className="text-minor">{routePayload.routePattern}</span></div>
                                </section>
                            </div>
                        </div>
                    ); 
            }
            
            // process action
            var action = null;
            if (afterActionInvokedPayload) {
                var content;
                if (contentPayload && contentPayload.binding) {
                    content = <ParamaterList argumentData={contentPayload.binding} />
                }
                
                action = (
                        <div className="tab-section tab-section-execution-action">
                            <div className="flex flex-row flex-inherit tab-section-header">
                                <div className="tab-title col-9">Action</div>
                            </div>
                            <div className="tab-section-boxing">
                                <section className="flex flex-row flex-inherit flex-base tab-section-item">
                                    <div className="tab-execution-important col-8">
                                        {afterActionInvokedPayload.actionControllerName}.{afterActionInvokedPayload.actionName}({content})
                                    </div>
                                    <div className="tab-execution-timing">{afterActionInvokedPayload.actionInvokedDuration} ms</div>
                                </section>
                                <CommandList beforeExecuteCommandMessages={beforeExecuteCommandMessages} afterExecuteCommandMessages={afterExecuteCommandMessages} beginMessage={beforeActionInvokedMessage} endMessage={afterActionInvokedMessage} />
                            </div>
                        </div>
                    ); 
            }
            
            // process view component
            var viewComponent = '';
            if (beforeViewComponentMessages && afterViewComponentMessages) {
                beforeViewComponentMessages = beforeViewComponentMessages.sort(function(a, b) { return a.ordinal - b.ordinal; });
                afterViewComponentMessages = _.indexBy(afterViewComponentMessages, 'payload.componentId');
                
                viewComponent = _.map(beforeViewComponentMessages, function(beforeViewComponetMessage, i) {
                    var beforeViewComponetPayload = beforeViewComponetMessage.payload;
                    var afterViewComponetMessage = afterViewComponentMessages[beforeViewComponetPayload.componentId];
                    var afterViewComponetPayload = afterViewComponetMessage.payload;
                    
                    var componentCommands = <CommandList beforeExecuteCommandMessages={beforeExecuteCommandMessages} afterExecuteCommandMessages={afterExecuteCommandMessages} beginMessage={beforeViewComponetMessage} endMessage={afterViewComponetMessage} />;
                    
                    return (
                            <div className="tab-section tab-section-execution-component">
                                <div className="flex flex-row flex-inherit tab-section-header">
                                    <div className="tab-title col-9">View Component</div>
                                </div>
                                <div className="tab-section-boxing">
                                    <section className="flex flex-row flex-inherit flex-base tab-section-item">
                                        <div className="tab-execution-important col-8">{beforeViewComponetPayload.componentName}</div>
                                        <div className="tab-execution-timing">{afterViewComponetPayload.componentDuration} ms<span className="tab-execution-timing-arrow">➦</span></div>
                                    </section>
                                    {componentCommands}
                                </div>
                            </div>
                        );
                });
            }
            
            // process action
            var view = null;
            if (actionViewFoundPayload && afterActionViewInvokedPayload) {
                var viewTitle = null;
                if (actionViewFoundPayload) { 
                    viewTitle = <div><span className="tab-execution-important">{actionViewFoundPayload.viewName}</span> - <span>{actionViewFoundPayload.viewPath}</span></div>;
                }
            
                view = (
                        <div className="tab-section tab-section-execution-view">
                            <div className="flex flex-row flex-inherit tab-section-header">
                                <div className="tab-title col-9">View Result</div>
                            </div>
                            <div className="tab-section-boxing">
                                <section className="flex flex-row flex-inherit flex-base tab-section-item">
                                    <div className="tab-execution-important col-8">{viewTitle}</div>
                                    <div className="tab-execution-timing">{afterActionViewInvokedPayload.viewDuration} ms</div>
                                </section>
                                {viewComponent}
                            </div>
                        </div>
                    );
            }
            
            //process post action commands
            var postCommands = null;
            if (afterActionResultMessage && endRequestMessage) { 
                postCommands = <CommandList beforeExecuteCommandMessages={beforeExecuteCommandMessages} afterExecuteCommandMessages={afterExecuteCommandMessages} beginMessage={afterActionResultMessage} endMessage={endRequestMessage} isRoot={true} />            
            }
            
            content = (
                <div>
                    <div className="tab-section text-minor">Execution on Server</div>
                    {preCommands}{route}{action}{view}{postCommands}
                </div>
            );
        }   
        else if (beginRequestPayload && endRequestPayload) {
            content = (
                <div>
                    <div className="tab-section text-minor">Execution on Server</div>
                    <RequestHeaders title="Request Headers" headers={beginRequestPayload.requestHeaders} />;
                    <RequestHeaders title="Response Headers" headers={endRequestPayload.responseHeaders} />;
                </div>
            );
        }
        else {
            content = <div className="tab-section text-minor">Could not find any data.</div>;
        }
        
        return content;
    }
});


// TODO: Need to come up with a better self registration process
(function () {
    var requestTabController = require('../request-tab');

    requestTabController.registerTab({
        key: 'tab.execution',
        title: 'Execution',
        component: module.exports
    });
})();
