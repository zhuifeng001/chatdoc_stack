export const createWorker = func => {
	if (typeof window === 'undefined') return;
	if (typeof Worker === 'undefined') return;

	const script = `(${func.toString()})()`;

	// 嵌入式的写法
	const workerScriptBlob = new Blob([script], { type: 'text/javascript' });

	return new Worker(window.URL.createObjectURL(workerScriptBlob));
};
