const {iterate, uniquify} = require("./utils");

//TODO: Refactor code
//TODO: Create new type with all possible types
//TODO: Add property to `Schema` to allow types wraping for array items when `keepOrder` is true and `keepLength` is false
//TODO: Add schema validation of itself
//TODO: Create documentation


/**
 * @typedef {{valid: true, matched: any}} ValidationSuccess
 */

/**
 * @typedef {{valid: false, message: string, path: string[]}} ValidationFailure
 */

/**
 * @typedef {ValidationSuccess | ValidationFailure} ValidationResult
 */

/**
 * @typedef {Object} Schema
 * @prop {string} [type="any"] 
 * @prop {string} [instance] 
 * @prop {Schema[]} [types] (`type` is ignored, if this is set)
 * @prop {string[]} [instances] (`instance` is ignored, if this is set)
 * @prop {Object<string, Schema>} [properties] Properties of the object to be matched
 * @prop {Schema[]} [items=[{type: "any"}]] (Available if `type == "array"` only)
 * @prop {boolean} [keepOrder=false] (Available if `type == "array"` only)
 * @prop {boolean} [keepLength=false] (Available if `type == "array"` only)
 * @prop {boolean} [nullable=false] 
 * @prop {boolean} [optional=false] 
 * @prop {boolean} [empty=true] Available for strings and array
 * @prop {number} [min=-Infinity] Minimal number value, string length or array length
 * @prop {number} [max=Infinity] Maximal number value, string length or array length
 * @prop {number} [length] Exact length of string or array
 * @prop {RegExp} [match] Available for strings. Validates string using regular expression.
 * @prop {any} [equals] Strict equality check against the value
 * @prop {any[]} [contains] An array of values that are allowed
 * @prop {any} [defaultValue] Default value for not present optional properties
 * @prop {(value: any, schema: Schema) => ValidationResult} [validator] Custom validation function
 */


/**
 *
 * @param {Schema} options
 * @return {string} 
 */
function formatOptions(options) {
	const {
		type = "any",
		instance,
		types,
		instances,
		properties,
		items = [{type: "any"}],
		keepOrder = false,
		keepLength = false,
		nullable = false,
		optional = false,
		empty = true,
		min = -Infinity,
		max = Infinity,
		length,
		match,
		equals,
		contains,
		defaultValue,
		validator
	} = options;

	const _types = types || [{type}];
	const _instances = instances || instance && [instance] || [];

	if(properties) {
		const keyValuePairs = iterate(properties)
			.map(([i, key, schema]) => {
				let computedType = formatOptions(schema);
				if(schema.optional) computedType = computedType.replace(/ \| undefined$/m, "");

				return `${key}${schema.optional ? "?" : ""}: ${computedType}`;
			});
		return `{${keyValuePairs.join(", ")}}`;
	} else {
		const computedTypes = _types
			.map(e => {
				const isArray = e.type == "array";
				const arrayTypes = isArray && items.map(q => formatOptions(q));
				let arrayStr = "";

				const isObject = !!e.properties;
				let objectStr = isObject && formatOptions({properties: e.properties}) || "";

				if(isArray && !isObject) {
					if(keepOrder) {
						arrayStr = `[${arrayTypes.join(", ")}${keepLength ? "" : ", ..."}]`;
					} else {
						const uniqueTypes = uniquify(arrayTypes);
						arrayStr = uniqueTypes.join(" | ");
						if(uniqueTypes.length > 1) arrayStr = `(${arrayStr})`;
						arrayStr = `${arrayStr}[${keepLength ? Math.max(items.length, min) : ""}]`;
					}
				}

				return _instances
					.map(t => {
						if(isObject) return objectStr;
						if(isArray) return arrayStr;
						if(e.type && e.type !== "any") return `${e.type} & ${t}`;
						return t;
					})
					.join(" | ") || objectStr || arrayStr || e.type || "any";
			});

		if(nullable) computedTypes.push("null");
		if(optional) computedTypes.push("undefined");

		return computedTypes.join(" | ");
	}
}

/**
 *
 * @param {any} value
 * @return {string} 
 */
function formatValueType(value) {
	if(value === null) return "null";
	if(value === undefined) return "undefined";
	if(typeof value == "string") return "string";
	if(typeof value == "number") return "number";
	if(typeof value == "boolean") return "boolean";
	if(typeof value == "object") {
		if(Array.isArray(value)) {
			return `[${value.map(e => formatValueType(e)).join(", ")}]`;
		} else if(Object.getPrototypeOf(value) === Object.prototype) {
			return `{${Object.keys(value).map(k => `${k}: ${formatValueType(value[k])}`).join(", ")}}`;
		} else {
			return value.constructor.name;
		}
	}
	return "any";
}

/**
 *
 * @param {any} value
 * @return {string} 
 */
function formatValue(value) {
	if(value === null) return "null";
	if(value === undefined) return "undefined";
	if(typeof value == "string") return `"${value}"`;
	if(typeof value == "number") return value.toString();
	if(typeof value == "boolean") return value.toString();
	if(typeof value == "object") {
		if(Array.isArray(value)) {
			return `[${value.map(e => formatValue(e)).join(", ")}]`;
		} else if(Object.getPrototypeOf(value) === Object.prototype) {
			return `{${Object.keys(value).map(k => `${k}: ${formatValue(value[k])}`).join(", ")}}`;
		} else {
			return value.toString();
		}
	}
	return value.toString();
}

/**
 *
 * @param {Object} object
 * @return {ValidationResult} 
 */
function createResult(object) {
	return object.valid ? Object.assign({valid: true}, object) : Object.assign({valid: false, path: [], message: ""}, object);
}



/**
 * 
 * @param {any} x 
 * @param {Schema} schema 
 * @returns {ValidationResult}
 */
function validate(x, schema) {
	if(schema.properties) {

		//Trying to validate a non-object value against a schema
		if(typeof x !== "object" || x === null) {
			return createResult({
				valid: false,
				message: `Expected 'object', instead got '${formatValueType(x)}'!`
			});
		}

		const matched = {};

		//Validate each property of the schema
		for(const key in schema.properties) {
			//Found a key in the object, so we can try to validate it
			// if(key in x) {
			const result = validate(x[key], schema.properties[key]);

			if(result.valid) {
				matched[key] = result.matched;
			} else {
				(result.path || (result.path = [])).unshift(key);
				return result;
			}
			// } else if(schema[key].optional) { //If the key is not present and it is optional, we can skip it
			// 	continue;
			// }
		}

		return createResult({valid: true, matched: matched});
	} else {

		// Deconstruct options
		const {
			type = "any",
			instance,
			types,
			instances,
			properties,
			items = [{type: "any"}],
			keepOrder = false,
			keepLength = false,
			nullable = false,
			optional = false,
			empty = true,
			min = -Infinity,
			max = Infinity,
			length,
			match,
			equals,
			contains,
			defaultValue,
			validator
		} = schema;


		// Invalid values validation
		{
			if(x === undefined) {
				if(optional) return createResult({valid: true, matched: "defaultValue" in schema ? defaultValue : x});
				else return createResult({
					valid: false,
					message: "Non-optional property is 'undefined'!"
				});
			}
			if(x === null) {
				if(nullable) return createResult({valid: true, matched: x});
				else return createResult({
					valid: false,
					message: "Non-nullable property is 'null'!"
				});
			}
		}


		// Type validation
		{
			let isTypeValid = false;
			let message = "";

			if(types) {
				for(const t of types) {
					const result = validate(x, t);

					if(result.valid) {
						isTypeValid = true;
						break;
					}
				}

				if(!isTypeValid) message = `Invalid property type! Expected '${formatOptions(schema)}', instead got '${formatValueType(x)}'!`;
				//if(!isTypeValid) message = `Invalid property type! Expected '${types.map(e => e.type).join(" | ")}', instead got '${typeof x}'!`;
			} else {
				if(type === "any") isTypeValid = true;
				if(type === "array") isTypeValid = Array.isArray(x);

				if(type === "bigint") isTypeValid = typeof x === "bigint";
				if(type === "boolean") isTypeValid = typeof x === "boolean";
				if(type === "function") isTypeValid = typeof x === "function";
				if(type === "integer") isTypeValid = typeof x === "number" && x % 1 === 0;
				if(type === "float") isTypeValid = typeof x === "number";
				if(type === "number") isTypeValid = typeof x === "number";
				if(type === "object") isTypeValid = typeof x === "object";
				if(type === "string") isTypeValid = typeof x === "string";
				if(type === "symbol") isTypeValid = typeof x === "symbol";
				if(type === "undefined") isTypeValid = typeof x === "undefined";

				if(!isTypeValid) message = `Invalid property type! Expected '${type}', instead got '${formatValueType(x)}'!`;
			}

			if(!isTypeValid) return createResult({
				valid: false,
				message: message
			});
		}


		// Length validation
		{
			const isMin = min !== -Infinity;
			const isMax = max !== Infinity;
			const isLength = length !== undefined;
			let message = "";

			if(type === "integer" || type === "float" || type === "number") {
				if(isMin && x < min) message = `Invalid number value! Minimal number value is '${min}', instead got '${x}'`;
				else if(isMax && x > max) message = `Invalid number value! Maximal number value is '${max}', instead got '${x}'`;
			}
			if(type === "string") {
				if(isLength && x.length !== length) message = `Invalid string length! Expected '${length}', instead got '${x.length}'!`;
				else if(!empty && x.length === 0) message = `Invalid string length! String cannot be empty!`;
				else if(isMin && x.length < min) message = `Invalid string length! Minimal string length is '${min}', instead got '${x.length}'`;
				else if(isMax && x.length > max) message = `Invalid string length! Maximal string length is '${max}', instead got '${x.length}'`;
			}
			if(type === "array") {
				if(isLength && x.length !== length) message = `Invalid array length! Expected '${length}', instead got '${x.length}'!`;
				else if(!empty && x.length === 0) message = `Invalid array length! Array cannot be empty!`;
				else if(isMin && x.length < min) message = `Invalid array length! Minimal array length is '${min}', instead got '${x.length}'`;
				else if(isMax && x.length > max) message = `Invalid array length! Maximal array length is '${max}', instead got '${x.length}'`;
			}

			if(message) return createResult({
				valid: false,
				message: message
			});
		}

		// Regex validation
		{
			if(match && type === "string") {
				if(!match.test(x)) {
					return createResult({
						valid: false,
						message: `String '${x}' does not match pattern '${formatValue(match)}'!`
					});
				}
			}
		}


		// Instance validation
		{
			const checkInstance = instances || instance;
			const className = checkInstance && x && x.constructor && x.constructor.name;
			let isInstanceValid = false || !checkInstance;
			let message = "";

			if(checkInstance && !className) {
				message = `Invalid property instance! Cannot get instance name of the property!`;
			}
			else if(instances) {
				for(const i of instances) {
					if(className === i) {
						isInstanceValid = true;
						break;
					}
				}

				if(!isInstanceValid) message = `Invalid property instance! Expected '${instances.join(" | ")}', instead got '${className}'!`;
			}
			else if(instance) {
				if(className === instance) isInstanceValid = true;
				else message = `Invalid property instance! Expected '${instance}', instead got '${x.constructor.name}'!`;
			}

			if(!isInstanceValid) return createResult({
				valid: false,
				message: message
			});
		}


		// Array validation
		{
			if(type === "array") {
				if(keepLength && x.length !== items.length) return createResult({
					valid: false,
					message: `Invalid number of elements in array! Expected '${items.length}' items, instead got '${x.length}'!`
				});

				for(const [i, e] of iterate(x)) {
					let error = null;
					let path = [];

					if(keepOrder) {
						//Values which don't have to be validated
						if(!items[i]) continue;

						//Strictly pick item on current index
						const result = validate(e, items[i]);
						if(result.valid) {
							x[i] = result.matched;
							continue;
						}

						error = result;
						path = result.path || [];
						path.unshift(`[${i}]`);
					} else {
						//Scan if the current type is provided in the list
						//TODO: The following code is probably quite useless:
						//no one would user multiple item types without keeping order
						//the current item in array must match all the provided schemas in the list and that's stupid
						//that mean the original comment above is incorrect
						for(const s of items) {
							const result = validate(e, s);
							if(result.valid) {
								x[i] = result.matched;
								continue;
							}

							error = result;
							path = result.path || [];
							path.unshift(`[${i}]`);
							break;
						}
					}

					if(error) return createResult({
						valid: false,
						message: `Invalid type of element in array! ${error.message}`,
						path: path
					});
				}
			}
		}


		// Schema validation
		//INFO: This code should be never executed
		//TODO: Remove this block?
		{
			if(properties) {
				const result = validate(x, properties);

				if(!result.valid) return createResult({
					valid: false,
					message: `Object does not match the schema! ${result.message}`,
					path: result.path
				});
			}
		}


		// Strict equality check
		{
			if("equals" in schema) {
				if(x !== equals) return createResult({
					valid: false,
					message: `Invalid property value! Expected value '${formatValue(equals)}', instead got '${formatValue(x)}'!`
				});
			}
		}


		// Enum validation
		{
			if("contains" in schema && Array.isArray(schema.contains)) {
				if(!contains.includes(x)) return createResult({
					valid: false,
					message: `Invalid property value! Expected values '${contains.slice(0, 5).map(formatValue).join(", ")}${contains.length > 5 ? ", ..." : ""}', instead got '${formatValue(x)}'!`
				});
			}
		}


		// Custom validator
		{
			if(typeof validator === "function") {
				const result = validator(x, schema);

				return result;
			}
		}


		// Passed all checks
		return createResult({valid: true, matched: x});
	}
}

module.exports = validate;