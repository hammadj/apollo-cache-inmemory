(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('apollo-utilities'), require('graphql/language/printer'), require('graphql-anywhere'), require('apollo-cache')) :
    typeof define === 'function' && define.amd ? define(['exports', 'apollo-utilities', 'graphql/language/printer', 'graphql-anywhere', 'apollo-cache'], factory) :
    (factory((global.apollo = global.apollo || {}, global.apollo.cache = global.apollo.cache || {}, global.apollo.cache.inmemory = {}),global.apollo.utilities,null,global.graphqlAnywhere,global.apolloCache.core));
}(this, (function (exports,apolloUtilities,printer,graphqlAnywhere,apolloCache) { 'use strict';

    graphqlAnywhere = graphqlAnywhere && graphqlAnywhere.hasOwnProperty('default') ? graphqlAnywhere['default'] : graphqlAnywhere;

    var haveWarned = false;
    /**
     * This fragment matcher is very basic and unable to match union or interface type conditions
     */
    var HeuristicFragmentMatcher = /** @class */ (function () {
        function HeuristicFragmentMatcher() {
            // do nothing
        }
        HeuristicFragmentMatcher.prototype.ensureReady = function () {
            return Promise.resolve();
        };
        HeuristicFragmentMatcher.prototype.canBypassInit = function () {
            return true; // we don't need to initialize this fragment matcher.
        };
        HeuristicFragmentMatcher.prototype.match = function (idValue, typeCondition, context) {
            var obj = context.store.get(idValue.id);
            if (!obj && idValue.id === 'ROOT_QUERY') {
                return true;
            }
            if (!obj) {
                return false;
            }
            if (!obj.__typename) {
                if (!haveWarned) {
                    console.warn("You're using fragments in your queries, but either don't have the addTypename:\n  true option set in Apollo Client, or you are trying to write a fragment to the store without the __typename.\n   Please turn on the addTypename option and include __typename when writing fragments so that Apollo Client\n   can accurately match fragments.");
                    console.warn('Could not find __typename on Fragment ', typeCondition, obj);
                    console.warn("DEPRECATION WARNING: using fragments without __typename is unsupported behavior " +
                        "and will be removed in future versions of Apollo client. You should fix this and set addTypename to true now.");
                    haveWarned = true;
                }
                context.returnPartialData = true;
                return true;
            }
            if (obj.__typename === typeCondition) {
                return true;
            }
            // XXX here we reach an issue - we don't know if this fragment should match or not. It's either:
            // 1. A fragment on a non-matching concrete type or interface or union
            // 2. A fragment on a matching interface or union
            // If it's 1, we don't want to return anything, if it's 2 we want to match. We can't tell the
            // difference, so we warn the user, but still try to match it (backcompat).
            apolloUtilities.warnOnceInDevelopment("You are using the simple (heuristic) fragment matcher, but your queries contain union or interface types.\n     Apollo Client will not be able to able to accurately map fragments." +
                "To make this error go away, use the IntrospectionFragmentMatcher as described in the docs: " +
                "https://www.apollographql.com/docs/react/recipes/fragment-matching.html", 'error');
            context.returnPartialData = true;
            return true;
        };
        return HeuristicFragmentMatcher;
    }());
    var IntrospectionFragmentMatcher = /** @class */ (function () {
        function IntrospectionFragmentMatcher(options) {
            if (options && options.introspectionQueryResultData) {
                this.possibleTypesMap = this.parseIntrospectionResult(options.introspectionQueryResultData);
                this.isReady = true;
            }
            else {
                this.isReady = false;
            }
            this.match = this.match.bind(this);
        }
        IntrospectionFragmentMatcher.prototype.match = function (idValue, typeCondition, context) {
            if (!this.isReady) {
                // this should basically never happen in proper use.
                throw new Error('FragmentMatcher.match() was called before FragmentMatcher.init()');
            }
            var obj = context.store.get(idValue.id);
            if (!obj) {
                return false;
            }
            if (!obj.__typename) {
                throw new Error("Cannot match fragment because __typename property is missing: " + JSON.stringify(obj));
            }
            if (obj.__typename === typeCondition) {
                return true;
            }
            var implementingTypes = this.possibleTypesMap[typeCondition];
            if (implementingTypes && implementingTypes.indexOf(obj.__typename) > -1) {
                return true;
            }
            return false;
        };
        IntrospectionFragmentMatcher.prototype.parseIntrospectionResult = function (introspectionResultData) {
            var typeMap = {};
            introspectionResultData.__schema.types.forEach(function (type) {
                if (type.kind === 'UNION' || type.kind === 'INTERFACE') {
                    typeMap[type.name] = type.possibleTypes.map(function (implementingType) { return implementingType.name; });
                }
            });
            return typeMap;
        };
        return IntrospectionFragmentMatcher;
    }());

    var ObjectCache = /** @class */ (function () {
        function ObjectCache(data) {
            if (data === void 0) { data = Object.create(null); }
            this.data = data;
        }
        ObjectCache.prototype.toObject = function () {
            return this.data;
        };
        ObjectCache.prototype.get = function (dataId) {
            return this.data[dataId];
        };
        ObjectCache.prototype.set = function (dataId, value) {
            this.data[dataId] = value;
        };
        ObjectCache.prototype.delete = function (dataId) {
            this.data[dataId] = undefined;
        };
        ObjectCache.prototype.clear = function () {
            this.data = Object.create(null);
        };
        ObjectCache.prototype.replace = function (newData) {
            this.data = newData || Object.create(null);
        };
        return ObjectCache;
    }());
    function defaultNormalizedCacheFactory(seed) {
        return new ObjectCache(seed);
    }

    var __extends = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __assign = (undefined && undefined.__assign) || Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    var WriteError = /** @class */ (function (_super) {
        __extends(WriteError, _super);
        function WriteError() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.type = 'WriteError';
            return _this;
        }
        return WriteError;
    }(Error));
    function enhanceErrorWithDocument(error, document) {
        // XXX A bit hacky maybe ...
        var enhancedError = new WriteError("Error writing result to store for query:\n " + printer.print(document));
        enhancedError.message += '\n' + error.message;
        enhancedError.stack = error.stack;
        return enhancedError;
    }
    /**
     * Writes the result of a query to the store.
     *
     * @param result The result object returned for the query document.
     *
     * @param query The query document whose result we are writing to the store.
     *
     * @param store The {@link NormalizedCache} used by Apollo for the `data` portion of the store.
     *
     * @param variables A map from the name of a variable to its value. These variables can be
     * referenced by the query document.
     *
     * @param dataIdFromObject A function that returns an object identifier given a particular result
     * object. See the store documentation for details and an example of this function.
     *
     * @param fragmentMap A map from the name of a fragment to its fragment definition. These fragments
     * can be referenced within the query document.
     *
     * @param fragmentMatcherFunction A function to use for matching fragment conditions in GraphQL documents
     */
    function writeQueryToStore(_a) {
        var result = _a.result, query = _a.query, _b = _a.storeFactory, storeFactory = _b === void 0 ? defaultNormalizedCacheFactory : _b, _c = _a.store, store = _c === void 0 ? storeFactory() : _c, variables = _a.variables, dataIdFromObject = _a.dataIdFromObject, _d = _a.fragmentMap, fragmentMap = _d === void 0 ? {} : _d, fragmentMatcherFunction = _a.fragmentMatcherFunction;
        var queryDefinition = apolloUtilities.getQueryDefinition(query);
        variables = apolloUtilities.assign({}, apolloUtilities.getDefaultValues(queryDefinition), variables);
        try {
            return writeSelectionSetToStore({
                dataId: 'ROOT_QUERY',
                result: result,
                selectionSet: queryDefinition.selectionSet,
                context: {
                    store: store,
                    storeFactory: storeFactory,
                    processedData: {},
                    variables: variables,
                    dataIdFromObject: dataIdFromObject,
                    fragmentMap: fragmentMap,
                    fragmentMatcherFunction: fragmentMatcherFunction,
                },
            });
        }
        catch (e) {
            throw enhanceErrorWithDocument(e, query);
        }
    }
    function writeResultToStore(_a) {
        var dataId = _a.dataId, result = _a.result, document = _a.document, _b = _a.storeFactory, storeFactory = _b === void 0 ? defaultNormalizedCacheFactory : _b, _c = _a.store, store = _c === void 0 ? storeFactory() : _c, variables = _a.variables, dataIdFromObject = _a.dataIdFromObject, fragmentMatcherFunction = _a.fragmentMatcherFunction;
        // XXX TODO REFACTOR: this is a temporary workaround until query normalization is made to work with documents.
        var operationDefinition = apolloUtilities.getOperationDefinition(document);
        var selectionSet = operationDefinition.selectionSet;
        var fragmentMap = apolloUtilities.createFragmentMap(apolloUtilities.getFragmentDefinitions(document));
        variables = apolloUtilities.assign({}, apolloUtilities.getDefaultValues(operationDefinition), variables);
        try {
            return writeSelectionSetToStore({
                result: result,
                dataId: dataId,
                selectionSet: selectionSet,
                context: {
                    store: store,
                    storeFactory: storeFactory,
                    processedData: {},
                    variables: variables,
                    dataIdFromObject: dataIdFromObject,
                    fragmentMap: fragmentMap,
                    fragmentMatcherFunction: fragmentMatcherFunction,
                },
            });
        }
        catch (e) {
            throw enhanceErrorWithDocument(e, document);
        }
    }
    function writeSelectionSetToStore(_a) {
        var result = _a.result, dataId = _a.dataId, selectionSet = _a.selectionSet, context = _a.context;
        var variables = context.variables, store = context.store, fragmentMap = context.fragmentMap;
        selectionSet.selections.forEach(function (selection) {
            var included = apolloUtilities.shouldInclude(selection, variables);
            if (apolloUtilities.isField(selection)) {
                var resultFieldKey = apolloUtilities.resultKeyNameFromField(selection);
                var value = result[resultFieldKey];
                if (included) {
                    if (typeof value !== 'undefined') {
                        writeFieldToStore({
                            dataId: dataId,
                            value: value,
                            field: selection,
                            context: context,
                        });
                    }
                }
            }
            else {
                // This is not a field, so it must be a fragment, either inline or named
                var fragment = void 0;
                if (apolloUtilities.isInlineFragment(selection)) {
                    fragment = selection;
                }
                else {
                    // Named fragment
                    fragment = (fragmentMap || {})[selection.name.value];
                    if (!fragment) {
                        throw new Error("No fragment named " + selection.name.value + ".");
                    }
                }
                var matches = true;
                if (context.fragmentMatcherFunction && fragment.typeCondition) {
                    // TODO we need to rewrite the fragment matchers for this to work properly and efficiently
                    // Right now we have to pretend that we're passing in an idValue and that there's a store
                    // on the context.
                    var idValue = apolloUtilities.toIdValue({ id: 'self', typename: undefined });
                    var fakeContext = {
                        // NOTE: fakeContext always uses ObjectCache
                        // since this is only to ensure the return value of 'matches'
                        store: new ObjectCache({ self: result }),
                        returnPartialData: false,
                        hasMissingField: false,
                        cacheRedirects: {},
                    };
                    matches = context.fragmentMatcherFunction(idValue, fragment.typeCondition.name.value, fakeContext);
                }
                if (included && matches) {
                    writeSelectionSetToStore({
                        result: result,
                        selectionSet: fragment.selectionSet,
                        dataId: dataId,
                        context: context,
                    });
                }
            }
        });
        return store;
    }
    // Checks if the id given is an id that was generated by Apollo
    // rather than by dataIdFromObject.
    function isGeneratedId(id) {
        return id[0] === '$';
    }
    function mergeWithGenerated(generatedKey, realKey, cache) {
        var generated = cache.get(generatedKey);
        var real = cache.get(realKey);
        Object.keys(generated).forEach(function (key) {
            var value = generated[key];
            var realValue = real[key];
            if (apolloUtilities.isIdValue(value) && isGeneratedId(value.id) && apolloUtilities.isIdValue(realValue)) {
                mergeWithGenerated(value.id, realValue.id, cache);
            }
            cache.delete(generatedKey);
            cache.set(realKey, __assign({}, generated, real));
        });
    }
    function isDataProcessed(dataId, field, processedData) {
        if (!processedData) {
            return false;
        }
        if (processedData[dataId]) {
            if (processedData[dataId].indexOf(field) >= 0) {
                return true;
            }
            else {
                processedData[dataId].push(field);
            }
        }
        else {
            processedData[dataId] = [field];
        }
        return false;
    }
    function writeFieldToStore(_a) {
        var field = _a.field, value = _a.value, dataId = _a.dataId, context = _a.context;
        var _b;
        var variables = context.variables, dataIdFromObject = context.dataIdFromObject, store = context.store;
        var storeValue;
        var storeObject;
        var storeFieldName = apolloUtilities.storeKeyNameFromField(field, variables);
        // specifies if we need to merge existing keys in the store
        var shouldMerge = false;
        // If we merge, this will be the generatedKey
        var generatedKey = '';
        // If this is a scalar value...
        if (!field.selectionSet || value === null) {
            storeValue =
                value != null && typeof value === 'object'
                    ? // If the scalar value is a JSON blob, we have to "escape" it so it can’t pretend to be
                        // an id.
                        { type: 'json', json: value }
                    : // Otherwise, just store the scalar directly in the store.
                        value;
        }
        else if (Array.isArray(value)) {
            var generatedId = dataId + "." + storeFieldName;
            storeValue = processArrayValue(value, generatedId, field.selectionSet, context);
        }
        else {
            // It's an object
            var valueDataId = dataId + "." + storeFieldName;
            var generated = true;
            // We only prepend the '$' if the valueDataId isn't already a generated
            // id.
            if (!isGeneratedId(valueDataId)) {
                valueDataId = '$' + valueDataId;
            }
            if (dataIdFromObject) {
                var semanticId = dataIdFromObject(value);
                // We throw an error if the first character of the id is '$. This is
                // because we use that character to designate an Apollo-generated id
                // and we use the distinction between user-desiginated and application-provided
                // ids when managing overwrites.
                if (semanticId && isGeneratedId(semanticId)) {
                    throw new Error('IDs returned by dataIdFromObject cannot begin with the "$" character.');
                }
                if (semanticId) {
                    valueDataId = semanticId;
                    generated = false;
                }
            }
            if (!isDataProcessed(valueDataId, field, context.processedData)) {
                writeSelectionSetToStore({
                    dataId: valueDataId,
                    result: value,
                    selectionSet: field.selectionSet,
                    context: context,
                });
            }
            // We take the id and escape it (i.e. wrap it with an enclosing object).
            // This allows us to distinguish IDs from normal scalars.
            var typename = value.__typename;
            storeValue = apolloUtilities.toIdValue({ id: valueDataId, typename: typename }, generated);
            // check if there was a generated id at the location where we're
            // about to place this new id. If there was, we have to merge the
            // data from that id with the data we're about to write in the store.
            storeObject = store.get(dataId);
            var escapedId = storeObject && storeObject[storeFieldName];
            if (escapedId !== storeValue && apolloUtilities.isIdValue(escapedId)) {
                var hadTypename = escapedId.typename !== undefined;
                var hasTypename = typename !== undefined;
                var typenameChanged = hadTypename && hasTypename && escapedId.typename !== typename;
                // If there is already a real id in the store and the current id we
                // are dealing with is generated, we throw an error.
                // One exception we allow is when the typename has changed, which occurs
                // when schema defines a union, both with and without an ID in the same place.
                // checks if we "lost" the read id
                if (generated && !escapedId.generated && !typenameChanged) {
                    throw new Error("Store error: the application attempted to write an object with no provided id" +
                        (" but the store already contains an id of " + escapedId.id + " for this object. The selectionSet") +
                        " that was trying to be written is:\n" +
                        printer.print(field));
                }
                // checks if we "lost" the typename
                if (hadTypename && !hasTypename) {
                    throw new Error("Store error: the application attempted to write an object with no provided typename" +
                        (" but the store already contains an object with typename of " + escapedId.typename + " for the object of id " + escapedId.id + ". The selectionSet") +
                        " that was trying to be written is:\n" +
                        printer.print(field));
                }
                if (escapedId.generated) {
                    generatedKey = escapedId.id;
                    // We should only merge if it's an object of the same type,
                    // otherwise we should delete the generated object
                    if (typenameChanged) {
                        // Only delete the generated object when the old object was
                        // inlined, and the new object is not. This is indicated by
                        // the old id being generated, and the new id being real.
                        if (!generated) {
                            store.delete(generatedKey);
                        }
                    }
                    else {
                        shouldMerge = true;
                    }
                }
            }
        }
        var newStoreObj = __assign({}, store.get(dataId), (_b = {}, _b[storeFieldName] = storeValue, _b));
        if (shouldMerge) {
            mergeWithGenerated(generatedKey, storeValue.id, store);
        }
        storeObject = store.get(dataId);
        if (!storeObject || storeValue !== storeObject[storeFieldName]) {
            store.set(dataId, newStoreObj);
        }
    }
    function processArrayValue(value, generatedId, selectionSet, context) {
        return value.map(function (item, index) {
            if (item === null) {
                return null;
            }
            var itemDataId = generatedId + "." + index;
            if (Array.isArray(item)) {
                return processArrayValue(item, itemDataId, selectionSet, context);
            }
            var generated = true;
            if (context.dataIdFromObject) {
                var semanticId = context.dataIdFromObject(item);
                if (semanticId) {
                    itemDataId = semanticId;
                    generated = false;
                }
            }
            if (!isDataProcessed(itemDataId, selectionSet, context.processedData)) {
                writeSelectionSetToStore({
                    dataId: itemDataId,
                    result: item,
                    selectionSet: selectionSet,
                    context: context,
                });
            }
            return apolloUtilities.toIdValue({ id: itemDataId, typename: item.__typename }, generated);
        });
    }

    var __assign$1 = (undefined && undefined.__assign) || Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    /**
     * The key which the cache id for a given value is stored in the result object. This key is private
     * and should not be used by Apollo client users.
     *
     * Uses a symbol if available in the environment.
     *
     * @private
     */
    var ID_KEY = typeof Symbol !== 'undefined' ? Symbol('id') : '@@id';
    /**
     * Resolves the result of a query solely from the store (i.e. never hits the server).
     *
     * @param {Store} store The {@link NormalizedCache} used by Apollo for the `data` portion of the
     * store.
     *
     * @param {DocumentNode} query The query document to resolve from the data available in the store.
     *
     * @param {Object} [variables] A map from the name of a variable to its value. These variables can
     * be referenced by the query document.
     *
     * @param {any} previousResult The previous result returned by this function for the same query.
     * If nothing in the store changed since that previous result then values from the previous result
     * will be returned to preserve referential equality.
     */
    function readQueryFromStore(options) {
        var optsPatch = { returnPartialData: false };
        return diffQueryAgainstStore(__assign$1({}, options, optsPatch)).result;
    }
    var readStoreResolver = function (fieldName, idValue, args, context, _a) {
        var resultKey = _a.resultKey, directives = _a.directives;
        assertIdValue(idValue);
        var objId = idValue.id;
        var obj = context.store.get(objId);
        var storeKeyName = fieldName;
        if (args || directives) {
            // We happen to know here that getStoreKeyName returns its first
            // argument unmodified if there are no args or directives, so we can
            // avoid calling the function at all in that case, as a small but
            // important optimization to this frequently executed code.
            storeKeyName = apolloUtilities.getStoreKeyName(storeKeyName, args, directives);
        }
        var fieldValue = void 0;
        if (obj) {
            fieldValue = obj[storeKeyName];
            if (typeof fieldValue === 'undefined' &&
                context.cacheRedirects &&
                (obj.__typename || objId === 'ROOT_QUERY')) {
                var typename = obj.__typename || 'Query';
                // Look for the type in the custom resolver map
                var type = context.cacheRedirects[typename];
                if (type) {
                    // Look for the field in the custom resolver map
                    var resolver = type[fieldName];
                    if (resolver) {
                        fieldValue = resolver(obj, args, {
                            getCacheKey: function (storeObj) {
                                return apolloUtilities.toIdValue({
                                    id: context.dataIdFromObject(storeObj),
                                    typename: storeObj.__typename,
                                });
                            },
                        });
                    }
                }
            }
        }
        if (typeof fieldValue === 'undefined') {
            if (!context.returnPartialData) {
                throw new Error("Can't find field " + storeKeyName + " on object (" + objId + ") " + JSON.stringify(obj, null, 2) + ".");
            }
            context.hasMissingField = true;
            return fieldValue;
        }
        // if this is an object scalar, it must be a json blob and we have to unescape it
        if (apolloUtilities.isJsonValue(fieldValue)) {
            // If the JSON blob is the same now as in the previous result, return the previous result to
            // maintain referential equality.
            //
            // `isEqual` will first perform a referential equality check (with `===`) in case the JSON
            // value has not changed in the store, and then a deep equality check if that fails in case a
            // new JSON object was returned by the API but that object may still be the same.
            if (idValue.previousResult &&
                apolloUtilities.isEqual(idValue.previousResult[resultKey], fieldValue.json)) {
                return idValue.previousResult[resultKey];
            }
            return fieldValue.json;
        }
        // If we had a previous result, try adding that previous result value for this field to our field
        // value. This will create a new value without mutating the old one.
        if (idValue.previousResult) {
            fieldValue = addPreviousResultToIdValues(fieldValue, idValue.previousResult[resultKey]);
        }
        return fieldValue;
    };
    /**
     * Given a store and a query, return as much of the result as possible and
     * identify if any data was missing from the store.
     * @param  {DocumentNode} query A parsed GraphQL query document
     * @param  {Store} store The Apollo Client store object
     * @param  {any} previousResult The previous result returned by this function for the same query
     * @return {result: Object, complete: [boolean]}
     */
    function diffQueryAgainstStore(_a) {
        var store = _a.store, query = _a.query, variables = _a.variables, previousResult = _a.previousResult, _b = _a.returnPartialData, returnPartialData = _b === void 0 ? true : _b, _c = _a.rootId, rootId = _c === void 0 ? 'ROOT_QUERY' : _c, fragmentMatcherFunction = _a.fragmentMatcherFunction, config = _a.config;
        // Throw the right validation error by trying to find a query in the document
        var queryDefinition = apolloUtilities.getQueryDefinition(query);
        variables = apolloUtilities.assign({}, apolloUtilities.getDefaultValues(queryDefinition), variables);
        var context = {
            // Global settings
            store: store,
            returnPartialData: returnPartialData,
            dataIdFromObject: (config && config.dataIdFromObject) || null,
            cacheRedirects: (config && config.cacheRedirects) || {},
            // Flag set during execution
            hasMissingField: false,
        };
        var rootIdValue = {
            type: 'id',
            id: rootId,
            previousResult: previousResult,
        };
        var result = graphqlAnywhere(readStoreResolver, query, rootIdValue, context, variables, {
            fragmentMatcher: fragmentMatcherFunction,
            resultMapper: resultMapper,
        });
        return {
            result: result,
            complete: !context.hasMissingField,
        };
    }
    function assertIdValue(idValue) {
        if (!apolloUtilities.isIdValue(idValue)) {
            throw new Error("Encountered a sub-selection on the query, but the store doesn't have an object reference. This should never happen during normal use unless you have custom code that is directly manipulating the store; please file an issue.");
        }
    }
    /**
     * Adds a previous result value to id values in a nested array. For a single id value and a single
     * previous result then the previous value is added directly.
     *
     * For arrays we put all of the ids from the previous result array in a map and add them to id
     * values with the same id.
     *
     * This function does not mutate. Instead it returns new instances of modified values.
     *
     * @private
     */
    function addPreviousResultToIdValues(value, previousResult) {
        // If the value is an `IdValue`, add the previous result to it whether or not that
        // `previousResult` is undefined.
        //
        // If the value is an array, recurse over each item trying to add the `previousResult` for that
        // item.
        if (apolloUtilities.isIdValue(value)) {
            return __assign$1({}, value, { previousResult: previousResult });
        }
        else if (Array.isArray(value)) {
            var idToPreviousResult_1 = new Map();
            // If the previous result was an array, we want to build up our map of ids to previous results
            // using the private `ID_KEY` property that is added in `resultMapper`.
            if (Array.isArray(previousResult)) {
                previousResult.forEach(function (item) {
                    // item can be null
                    if (item && item[ID_KEY]) {
                        idToPreviousResult_1.set(item[ID_KEY], item);
                        // idToPreviousResult[item[ID_KEY]] = item;
                    }
                });
            }
            // For every value we want to add the previous result.
            return value.map(function (item, i) {
                // By default the previous result for this item will be in the same array position as this
                // item.
                var itemPreviousResult = previousResult && previousResult[i];
                // If the item is an id value, we should check to see if there is a previous result for this
                // specific id. If there is, that will be the value for `itemPreviousResult`.
                if (apolloUtilities.isIdValue(item)) {
                    itemPreviousResult =
                        idToPreviousResult_1.get(item.id) || itemPreviousResult;
                }
                return addPreviousResultToIdValues(item, itemPreviousResult);
            });
        }
        // Return the value, nothing changed.
        return value;
    }
    /**
     * Maps a result from `graphql-anywhere` to a final result value.
     *
     * If the result and the previous result from the `idValue` pass a shallow equality test, we just
     * return the `previousResult` to maintain referential equality.
     *
     * We also add a private id property to the result that we can use later on.
     *
     * @private
     */
    function resultMapper(resultFields, idValue) {
        // If we had a previous result, we may be able to return that and preserve referential equality
        if (idValue.previousResult) {
            var currentResultKeys_1 = Object.keys(resultFields);
            var sameAsPreviousResult = 
            // Confirm that we have the same keys in both the current result and the previous result.
            Object.keys(idValue.previousResult).every(function (key) { return currentResultKeys_1.indexOf(key) > -1; }) &&
                // Perform a shallow comparison of the result fields with the previous result. If all of
                // the shallow fields are referentially equal to the fields of the previous result we can
                // just return the previous result.
                //
                // While we do a shallow comparison of objects, but we do a deep comparison of arrays.
                currentResultKeys_1.every(function (key) {
                    return areNestedArrayItemsStrictlyEqual(resultFields[key], idValue.previousResult[key]);
                });
            if (sameAsPreviousResult) {
                return idValue.previousResult;
            }
        }
        Object.defineProperty(resultFields, ID_KEY, {
            enumerable: false,
            configurable: true,
            writable: false,
            value: idValue.id,
        });
        return resultFields;
    }
    /**
     * Compare all the items to see if they are all referentially equal in two arrays no matter how
     * deeply nested the arrays are.
     *
     * @private
     */
    function areNestedArrayItemsStrictlyEqual(a, b) {
        // If `a` and `b` are referentially equal, return true.
        if (a === b) {
            return true;
        }
        // If either `a` or `b` are not an array or not of the same length return false. `a` and `b` are
        // known to not be equal here, we checked above.
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return false;
        }
        // Otherwise let us compare all of the array items (which are potentially nested arrays!) to see
        // if they are equal.
        return a.every(function (item, i) { return areNestedArrayItemsStrictlyEqual(item, b[i]); });
    }

    var __assign$2 = (undefined && undefined.__assign) || Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    var RecordingCache = /** @class */ (function () {
        function RecordingCache(data) {
            if (data === void 0) { data = {}; }
            this.data = data;
            this.recordedData = {};
        }
        RecordingCache.prototype.record = function (transaction) {
            transaction(this);
            var recordedData = this.recordedData;
            this.recordedData = {};
            return recordedData;
        };
        RecordingCache.prototype.toObject = function () {
            return __assign$2({}, this.data, this.recordedData);
        };
        RecordingCache.prototype.get = function (dataId) {
            if (this.recordedData.hasOwnProperty(dataId)) {
                // recording always takes precedence:
                return this.recordedData[dataId];
            }
            return this.data[dataId];
        };
        RecordingCache.prototype.set = function (dataId, value) {
            if (this.get(dataId) !== value) {
                this.recordedData[dataId] = value;
            }
        };
        RecordingCache.prototype.delete = function (dataId) {
            this.recordedData[dataId] = undefined;
        };
        RecordingCache.prototype.clear = function () {
            var _this = this;
            Object.keys(this.data).forEach(function (dataId) { return _this.delete(dataId); });
            this.recordedData = {};
        };
        RecordingCache.prototype.replace = function (newData) {
            this.clear();
            this.recordedData = __assign$2({}, newData);
        };
        return RecordingCache;
    }());
    function record(startingState, transaction) {
        var recordingCache = new RecordingCache(startingState);
        return recordingCache.record(transaction);
    }

    var __extends$1 = (undefined && undefined.__extends) || (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var __assign$3 = (undefined && undefined.__assign) || Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    var defaultConfig = {
        fragmentMatcher: new HeuristicFragmentMatcher(),
        dataIdFromObject: defaultDataIdFromObject,
        addTypename: true,
        storeFactory: defaultNormalizedCacheFactory,
    };
    function defaultDataIdFromObject(result) {
        if (result.__typename) {
            if (result.id !== undefined) {
                return result.__typename + ":" + result.id;
            }
            if (result._id !== undefined) {
                return result.__typename + ":" + result._id;
            }
        }
        return null;
    }
    var InMemoryCache = /** @class */ (function (_super) {
        __extends$1(InMemoryCache, _super);
        function InMemoryCache(config) {
            if (config === void 0) { config = {}; }
            var _this = _super.call(this) || this;
            _this.optimistic = [];
            _this.watches = [];
            _this.typenameDocumentCache = new WeakMap();
            // Set this while in a transaction to prevent broadcasts...
            // don't forget to turn it back on!
            _this.silenceBroadcast = false;
            _this.config = __assign$3({}, defaultConfig, config);
            // backwards compat
            if (_this.config.customResolvers) {
                console.warn('customResolvers have been renamed to cacheRedirects. Please update your config as we will be deprecating customResolvers in the next major version.');
                _this.config.cacheRedirects = _this.config.customResolvers;
            }
            if (_this.config.cacheResolvers) {
                console.warn('cacheResolvers have been renamed to cacheRedirects. Please update your config as we will be deprecating cacheResolvers in the next major version.');
                _this.config.cacheRedirects = _this.config.cacheResolvers;
            }
            _this.addTypename = _this.config.addTypename;
            _this.data = _this.config.storeFactory();
            return _this;
        }
        InMemoryCache.prototype.restore = function (data) {
            if (data)
                this.data.replace(data);
            return this;
        };
        InMemoryCache.prototype.extract = function (optimistic) {
            if (optimistic === void 0) { optimistic = false; }
            if (optimistic && this.optimistic.length > 0) {
                var patches = this.optimistic.map(function (opt) { return opt.data; });
                return Object.assign.apply(Object, [{}, this.data.toObject()].concat(patches));
            }
            return this.data.toObject();
        };
        InMemoryCache.prototype.read = function (query) {
            if (query.rootId && this.data.get(query.rootId) === undefined) {
                return null;
            }
            return readQueryFromStore({
                store: this.config.storeFactory(this.extract(query.optimistic)),
                query: this.transformDocument(query.query),
                variables: query.variables,
                rootId: query.rootId,
                fragmentMatcherFunction: this.config.fragmentMatcher.match,
                previousResult: query.previousResult,
                config: this.config,
            });
        };
        InMemoryCache.prototype.write = function (write) {
            writeResultToStore({
                dataId: write.dataId,
                result: write.result,
                variables: write.variables,
                document: this.transformDocument(write.query),
                store: this.data,
                dataIdFromObject: this.config.dataIdFromObject,
                fragmentMatcherFunction: this.config.fragmentMatcher.match,
            });
            this.broadcastWatches();
        };
        InMemoryCache.prototype.diff = function (query) {
            return diffQueryAgainstStore({
                store: this.config.storeFactory(this.extract(query.optimistic)),
                query: this.transformDocument(query.query),
                variables: query.variables,
                returnPartialData: query.returnPartialData,
                previousResult: query.previousResult,
                fragmentMatcherFunction: this.config.fragmentMatcher.match,
                config: this.config,
            });
        };
        InMemoryCache.prototype.watch = function (watch) {
            var _this = this;
            this.watches.push(watch);
            return function () {
                _this.watches = _this.watches.filter(function (c) { return c !== watch; });
            };
        };
        InMemoryCache.prototype.evict = function (query) {
            throw new Error("eviction is not implemented on InMemory Cache");
        };
        InMemoryCache.prototype.reset = function () {
            this.data.clear();
            this.broadcastWatches();
            return Promise.resolve();
        };
        InMemoryCache.prototype.removeOptimistic = function (id) {
            var _this = this;
            // Throw away optimistic changes of that particular mutation
            var toPerform = this.optimistic.filter(function (item) { return item.id !== id; });
            this.optimistic = [];
            // Re-run all of our optimistic data actions on top of one another.
            toPerform.forEach(function (change) {
                _this.recordOptimisticTransaction(change.transaction, change.id);
            });
            this.broadcastWatches();
        };
        InMemoryCache.prototype.performTransaction = function (transaction) {
            // TODO: does this need to be different, or is this okay for an in-memory cache?
            var alreadySilenced = this.silenceBroadcast;
            this.silenceBroadcast = true;
            transaction(this);
            if (!alreadySilenced) {
                // Don't un-silence since this is a nested transaction
                // (for example, a transaction inside an optimistic record)
                this.silenceBroadcast = false;
            }
            this.broadcastWatches();
        };
        InMemoryCache.prototype.recordOptimisticTransaction = function (transaction, id) {
            var _this = this;
            this.silenceBroadcast = true;
            var patch = record(this.extract(true), function (recordingCache) {
                // swapping data instance on 'this' is currently necessary
                // because of the current architecture
                var dataCache = _this.data;
                _this.data = recordingCache;
                _this.performTransaction(transaction);
                _this.data = dataCache;
            });
            this.optimistic.push({
                id: id,
                transaction: transaction,
                data: patch,
            });
            this.silenceBroadcast = false;
            this.broadcastWatches();
        };
        InMemoryCache.prototype.transformDocument = function (document) {
            if (this.addTypename) {
                var result = this.typenameDocumentCache.get(document);
                if (!result) {
                    this.typenameDocumentCache.set(document, (result = apolloUtilities.addTypenameToDocument(document)));
                }
                return result;
            }
            return document;
        };
        InMemoryCache.prototype.readQuery = function (options, optimistic) {
            if (optimistic === void 0) { optimistic = false; }
            return this.read({
                query: options.query,
                variables: options.variables,
                optimistic: optimistic,
            });
        };
        InMemoryCache.prototype.readFragment = function (options, optimistic) {
            if (optimistic === void 0) { optimistic = false; }
            return this.read({
                query: this.transformDocument(apolloUtilities.getFragmentQueryDocument(options.fragment, options.fragmentName)),
                variables: options.variables,
                rootId: options.id,
                optimistic: optimistic,
            });
        };
        InMemoryCache.prototype.writeQuery = function (options) {
            this.write({
                dataId: 'ROOT_QUERY',
                result: options.data,
                query: this.transformDocument(options.query),
                variables: options.variables,
            });
        };
        InMemoryCache.prototype.writeFragment = function (options) {
            this.write({
                dataId: options.id,
                result: options.data,
                query: this.transformDocument(apolloUtilities.getFragmentQueryDocument(options.fragment, options.fragmentName)),
                variables: options.variables,
            });
        };
        InMemoryCache.prototype.broadcastWatches = function () {
            var _this = this;
            // Skip this when silenced (like inside a transaction)
            if (this.silenceBroadcast)
                return;
            // right now, we invalidate all queries whenever anything changes
            this.watches.forEach(function (c) {
                var newData = _this.diff({
                    query: c.query,
                    variables: c.variables,
                    // TODO: previousResult isn't in the types - this will only work
                    // with ObservableQuery which is in a different package
                    previousResult: c.previousResult && c.previousResult(),
                    optimistic: c.optimistic,
                });
                c.callback(newData);
            });
        };
        return InMemoryCache;
    }(apolloCache.ApolloCache));

    exports.InMemoryCache = InMemoryCache;
    exports.defaultDataIdFromObject = defaultDataIdFromObject;
    exports.ID_KEY = ID_KEY;
    exports.readQueryFromStore = readQueryFromStore;
    exports.diffQueryAgainstStore = diffQueryAgainstStore;
    exports.assertIdValue = assertIdValue;
    exports.WriteError = WriteError;
    exports.enhanceErrorWithDocument = enhanceErrorWithDocument;
    exports.writeQueryToStore = writeQueryToStore;
    exports.writeResultToStore = writeResultToStore;
    exports.writeSelectionSetToStore = writeSelectionSetToStore;
    exports.HeuristicFragmentMatcher = HeuristicFragmentMatcher;
    exports.IntrospectionFragmentMatcher = IntrospectionFragmentMatcher;
    exports.ObjectCache = ObjectCache;
    exports.defaultNormalizedCacheFactory = defaultNormalizedCacheFactory;
    exports.RecordingCache = RecordingCache;
    exports.record = record;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=bundle.umd.js.map
