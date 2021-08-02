// eslint-disable-next-line valid-jsdoc
/**
 * Create iterable key-value pairs.
 * @template T
 * @param {T[] | T} iterable Iterable Object, Array or any other value.
 * @returns {T !extends { [key: string]: any } ? [number, T][] : [number, keyof T, T[keyof T]][]} Iterator
 * @example
 * iterate([4, 5, 6]);           // [[0, 4], [1, 5], [2, 6]]
 * iterate([]);                  // []
 * iterate({a: 4, b: 5, c: 6});  // [[0, "a", 4], [1, "b", 5], [2, "c", 6]]
 * iterate({});                  // []
 * iterate("bar");               // [[0, "b"], [1, "a"], [2, "r"]]
 * iterate(11);                  // [[0, 11]]
 * iterate(true);                // [[0, true]]
 * iterate(false);               // [[0, false]]
 * iterate(null);                // []
 * iterate(undefined);           // []
 */
function iterate(iterable) {
	if(iterable === undefined || iterable === null) return [];
	else if(typeof iterable === "string") return /** @type {any} */([...iterable].map((char, i) => [i, char]));
	else if(iterable instanceof Array) return /** @type {any} */(iterable.map((value, i) => [i, value]));
	else if(iterable.constructor === Object) return /** @type {any} */(Object.entries(iterable).map(([key, value], i) => [i, key, value]));
	else return /** @type {any} */([[0, iterable]]);
}

// eslint-disable-next-line valid-jsdoc
/**
 * Uniquifies input value.
 * 
 * If the input value `x` is `Iterable` it eliminates duplicates from a list.
 * If the input value `x` is `Object` literal it creates shallow copy of the Object.
 * If the input value `x` is primitive it will be returned unchanged.
 * 
 * Special case: If the input value `x` is `string` it is splitted into char array and duplicates are removed.
 * @template T
 * @param {T} x Any value (should be Iterable (Array or String) or Object literal)
 * @return {T extends string ? string[] : T} 
 * @example
 * const o = {foo: "bar"};
 * 
 * uniquify(0);             // 0
 * uniquify(8);             // 8
 * uniquify(true);          // true
 * uniquify(false);         // false
 * uniquify(null);          // null
 * uniquify(undefined);     // undefined
 * uniquify("");            // []
 * uniquify("test");        // ["t", "e", "s"]
 * uniquify([1, 2, 3]);     // [1, 2, 3] != x
 * uniquify([1, 2, 3, 2, 3, 3, 1]);  // [1, 2, 3]
 * uniquify([o, {"baz":"fab"}, o]);  // [{"foo":"bar"} == o, {"baz":"fab"}]
 * uniquify([{"boo":"faz"}, {"boo":"faz"}]);  // [{"boo":"faz"}, {"boo":"faz"}] != x
 * uniquify(o);             // {"foo":"bar"} != o
 * uniquify({"bar":"baz"}); // {"bar":"baz"} != x
 */
function uniquify(x) {
	if(x === null || x === undefined) return /** @type {any} */(x);
	if(x[Symbol.iterator]) return /** @type {any} */([...new Set(/** @type {any} */(x))]);
	if(x.constructor === Object) {
		const obj = /** @type {any} */({});
		for(const key in x) obj[key] = x[key];
		return obj;
	}
	return /** @type {any} */(x);
}

module.exports = {
	iterate,
	uniquify
};