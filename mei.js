/**
*      Events. Pub/Sub system for Loosely Coupled logic.
*      Based on Peter Higgins' port from Dojo to jQuery
*      https://github.com/phiggins42/bloody-jquery-plugins/blob/master/pubsub.js
*
*      Re-adapted to vanilla Javascript
*
*      Copied from https://github.com/DDMAL/diva.js/blob/develop/source/js/utils.js
*      and adapted to accept arguments on subscription
*
*/
var mei = (function() {
    var cache = {};
    var argsCache = {};
    var pub = {
        Events: {
            /**
             *      Events.publish
             *      e.g.: Events.publish("PageDidLoad", [pageIndex, filename, pageSelector], this);
             *
             *      @class Events
             *      @method publish
             *      @param topic {String}
             *      @param args     {Array}
             *      @param scope {Object} Optional
             */
            publish: function (topic, args, scope)
            {
                if (cache[topic])
                {
                    var thisTopic = cache[topic],
                        i = thisTopic.length;

                    var thisTopicArgs = argsCache[topic];

                    while (i--)
                        thisTopic[i].apply( scope || this, args || thisTopicArgs[i] || []);
                }
            },
            /**
             *      Events.subscribe
             *      e.g.: var handle = mei.Events.subscribe("HelloEvent", createBoxWorker, [2, 'hello']);
             *
             *      @class Events
             *      @method subscribe
             *      @param topic {String}
             *      @param callback {Function}
             *      @param args {Array}
             *      @return Event handler {Array}
             */
            subscribe: function (topic, callback, args)
            {
                if (!cache[topic])
                    cache[topic] = [];

                if (!argsCache[topic])
                    argsCache[topic] = [];

                cache[topic].push(callback);
                argsCache[topic].push(args || []);
                return [topic, callback, args];
            },
            /**
             *      Events.unsubscribe
             *      e.g.: var handle = mei.Events.subscribe("HelloEvent", createBoxWorker, [2, 'hello']);
             *              mei.Events.unsubscribe(handle);
             *
             *      @class Events
             *      @method unsubscribe
             *      @param handle {Array}
             *      @param args {Array}
             *      @param completely {Boolean}
             */
            unsubscribe: function (handle, completely)
            {
                var t = handle[0],
                    i = cache[t].length,
                    a = handle[2];

                if (cache[t])
                {
                    while (i--)
                    {
                        if (cache[t][i] === handle[1])
                        {
                            argsCache[t].splice(i, 1);
                            if (completely)
                                delete argsCache[t];

                            cache[t].splice(i, 1);
                            if (completely)
                                delete cache[t];
                        }
                    }
                }
            }
        }
    };
    return pub;
}());
