export type PromiseWithAbort<T = any> = {
	promise?: Promise<T>;
	abort?: (reason?: any) => void;
};

export const genPromiseWithAbort = <T = any>(p: Promise<T>): PromiseWithAbort => {
	const obj: PromiseWithAbort = {};
	//内部定一个新的promise，用来终止执行
	const p1 = new Promise(function (resolve, reject) {
		obj.abort = reject;
	});
	obj.promise = Promise.race([p, p1]);
	return obj;
};
