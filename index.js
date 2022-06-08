const {iterate, uniquify} = require("./utils");

//TODO: Refactor code
//TODO: Create new type with all possible types
//TODO: Add property to `SchemaOptions` to allow arrays to have only predefined values (enum)
//TODO: Add property to `SchemaOptions` to allow types wraping for array items when `keepOrder` is true and `keepLength` is false
//TODO: Add schema validation of itself
//TODO: Create documentation

/**
 * @typedef {{valid: true}} ValidationSuccess
 */

/**
 * @typedef {{valid: false, message: string, path: string[]}} ValidationFailure
 */

/**
 * @typedef {ValidationSuccess | ValidationFailure} ValidationResult
 */

/**
 * @typedef {Object} SchemaOptions
 * @prop {string} [type="any"] 
 * @prop {string} [instance] 
 * @prop {SchemaOptions[]} [types] (`type` is ignored, if this is set)
 * @prop {string[]} [instances] (`instance` is ignored, if this is set)
 * @prop {Schema} [schema] 
 * @prop {SchemaOptions[]} [items=[{type: "any"}]] (Available if `type == "array"` only)
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
 * @prop {(value: any, schema: Schema | SchemaOptions) => ValidationResult} [validator] Custom validation function
 */

/**
 * @typedef {Object<string, SchemaOptions>} Schema
 */


/**
 *
 * @param {SchemaOptions} options
 * @return {string} 
 */
function formatOptions(options) {
	const {
		type = "any",
		instance,
		types,
		instances,
		schema,
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
		validator
	} = options;

	const _types = types || [{type}];
	const _instances = instances || instance && [instance] || [];

	if(schema) {
		const schemaPairs = iterate(schema)
			.filter(e => e[1] !== "$schema")
			.map(([i, k, q]) => {
				let computedType = formatOptions(q);
				if(q.optional) computedType = computedType.replace(/ \| undefined$/m, "");

				return `${k}${q.optional ? "?" : ""}: ${computedType}`;
			});
		return `{${schemaPairs.join(", ")}}`;
	} else {
		const computedTypes = _types
			.map(e => {
				const isArray = e.type == "array";
				const arrayTypes = isArray && items.map(q => formatOptions(q));
				let arrayStr = "";

				const isSchema = !!e.schema;
				let schemaStr = isSchema && formatOptions({schema: e.schema}) || "";

				if(isArray && !isSchema) {
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
						if(isSchema) return schemaStr;
						if(isArray) return arrayStr;
						if(e.type && e.type !== "any") return `${e.type} & ${t}`;
						return t;
					})
					.join(" | ") || schemaStr || arrayStr || e.type || "any";
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
function formatValue(value) {
	if(value === null) return "null";
	if(value === undefined) return "undefined";
	if(typeof value == "string") return "string";
	if(typeof value == "number") return "number";
	if(typeof value == "boolean") return "boolean";
	if(typeof value == "object") {
		if(Array.isArray(value)) {
			return `[${value.map(e => formatValue(e)).join(", ")}]`;
		} else {
			return `{${Object.keys(value).map(k => `${k}: ${formatValue(value[k])}`).join(", ")}}`;
		}
	}
	return "any";
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
 * @param {Schema | SchemaOptions} schema 
 * @returns {ValidationResult}
 */
function validate(x, schema) {
	if(schema.$schema) {

		//Trying to validate a non-object value against a schema
		if(typeof x !== "object" || x === null) {
			return createResult({
				valid: false,
				message: `Expected 'object', instead got '${formatValue(x)}'!`
			});
		}

		//Validate each property of the schema
		for(const key in schema) {
			if(key == "$schema") continue;

			//Found a key in the object, so we can try to validate it
			if(key in x) {
				const result = validate(x[key], schema[key]);

				if(!result.valid) {
					(result.path || (result.path = [])).unshift(key);
					return result;
				}
			} else if(schema[key].optional) { //If the key is not present and it is optional, we can skip it
				continue;
			}
		}

		return createResult({valid: true});
	} else {
		/** @type {SchemaOptions} */
		const options = schema;


		// Deconstruct options
		const {
			type = "any",
			instance,
			types,
			instances,
			schema: _schema,
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
			validator
		} = options;


		// Invalid values validation
		{
			if(x === undefined) {
				if(optional) return createResult({valid: true});
				else return createResult({
					valid: false,
					message: "Non-optional property is 'undefined'!"
				});
			}
			if(x === null) {
				if(nullable) return createResult({valid: true});
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

				if(!isTypeValid) message = `Invalid property type! Expected '${formatOptions(schema)}', instead got '${formatValue(x)}'!`;
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

				if(!isTypeValid) message = `Invalid property type! Expected '${type}', instead got '${formatValue(x)}'!`;
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
						message: `String '${x}' does not match pattern '${match.toString()}'!`
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
						if(result.valid) continue;

						error = result;
						path = result.path || [];
						path.unshift(`[${i}]`);
					} else {
						//Scan if the current type is provided in the list
						for(const s of items) {
							const result = validate(e, s);
							if(result.valid) continue;

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
		{
			if(_schema) {
				_schema.$schema = true;
				const result = validate(x, _schema);

				if(!result.valid) return createResult({
					valid: false,
					message: `Object does not match the schema! ${result.message}`,
					path: result.path
				});
			}
		}


		// Strict equality check
		{
			if("equals" in options) {
				if(x !== equals) return createResult({
					valid: false,
					message: `Invalid property value! Expected value '${equals}', instead got '${x}'!`
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
		return createResult({valid: true});
	}
}

module.exports = validate;