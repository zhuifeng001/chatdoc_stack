import { Func } from '@/types';

/**
 * 异步函数是否是 立即执行
 * @param func
 * @returns
 */
export const doAsyncFuncImmediately = (func: Func, ...args: any[]): Promise<boolean> => {
	return new Promise(async resolve => {
		let immediate = 0;
		setTimeout(() => {
			if (immediate === 2) {
				resolve(true);
				return;
			}
			immediate = 1;
		});
		await func(...args);
		if (immediate === 1) {
			resolve(false);
			return;
		}
		immediate = 2;
	});
};
