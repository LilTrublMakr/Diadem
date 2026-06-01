export function getId() {
	if (crypto.randomUUID) {
		return crypto.randomUUID();
	}

	// without https, crypto.randomUUID may not be available, this is ok
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
