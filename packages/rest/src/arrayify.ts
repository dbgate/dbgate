type FlatObject = Record<string, any>;

function isPlainObject(value: any): value is Record<string, any> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function flattenValue(value: any) {
	if (Array.isArray(value)) {
		const primitiveArray = value.every(item => item == null || typeof item !== 'object');
		if (primitiveArray) {
			return value.join(', ');
		}
		return JSON.stringify(value);
	}
	return value;
}

function flattenObject(obj: Record<string, any>, prefix = '', out: FlatObject = {}, visited = new WeakSet()): FlatObject {
	if (visited.has(obj)) return out;
	visited.add(obj);

	for (const [key, value] of Object.entries(obj)) {
		const nextKey = prefix ? `${prefix}.${key}` : key;

		if (isPlainObject(value)) {
			flattenObject(value, nextKey, out, visited);
			continue;
		}

		out[nextKey] = flattenValue(value);
	}

	return out;
}

function unwrapArrayItem(item: any) {
	if (isPlainObject(item) && isPlainObject(item.node)) {
		return item.node;
	}
	return item;
}

function collectArrayCandidates(
	value: any,
	set: Set<any[]>,
	visited = new WeakSet(),
	depth = 0
): void {
	if (depth > 10) return;
	if (Array.isArray(value)) {
		set.add(value);
		return;
	}

	if (!isPlainObject(value)) return;
	if (visited.has(value)) return;
	visited.add(value);

	if (Array.isArray(value.edges)) set.add(value.edges);
	if (Array.isArray(value.nodes)) set.add(value.nodes);
	if (Array.isArray(value.items)) set.add(value.items);

	for (const nested of Object.values(value)) {
		collectArrayCandidates(nested, set, visited, depth + 1);
	}
}

function findUniqueArrayCandidate(value: any): any[] | null {
	if (Array.isArray(value)) return value;

	const candidates = new Set<any[]>();
	collectArrayCandidates(value, candidates);

	if (candidates.size !== 1) return null;
	return candidates.values().next().value ?? null;
}

export function arrayifyToFlatObjects(input: any): FlatObject[] | undefined {
	const arrayCandidate = findUniqueArrayCandidate(input);

	if (!arrayCandidate) return undefined;

	return arrayCandidate.map(item => {
		const unwrapped = unwrapArrayItem(item);
		if (isPlainObject(unwrapped)) {
			return flattenObject(unwrapped);
		}
		return { value: unwrapped };
	});
}
