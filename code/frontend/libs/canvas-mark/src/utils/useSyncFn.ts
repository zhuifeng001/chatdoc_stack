type AsyncFunc<T = any> = (...args: any[]) => Promise<T>;

/**
 * 如果某个异步函数同时执行多次，将其转换为，同步调用多次
 */
export const useSyncFn = (fn: AsyncFunc) => {
	const bucket: number[] = [];
	let rendering = false;
	// 多次同时触发，多次会同步执行
	return async (...args) => {
		if (rendering) {
			bucket.push(1);
			return;
		}
		rendering = true;
		await fn(...args);

		while (bucket.length) {
			bucket.shift();
			await fn(...args);
		}
		rendering = false;
	};
};
