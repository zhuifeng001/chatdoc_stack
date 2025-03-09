import { Func } from '@/types';
import { throttle, debounce } from 'lodash-es';

export type ResizeObserverOptions = {
	throttle?: number;
	debounce?: number;
	enableFrame?: boolean;
};

/**
 * 监听 dom节点尺寸变化
 */
export const useResizeListener = (
	selector: string | Element,
	callback: Func,
	options: ResizeObserverOptions = { throttle: 100, enableFrame: false }
) => {
	// 选择需要观察变动的节点
	let targetNode = selector as Element;
	if (typeof selector === 'string') {
		targetNode = document.querySelector(selector) as HTMLElement;
	}

	if (!targetNode) return;

	const { throttle: throttleTime, debounce: debounceTime } = options;

	const observerFunc = function (entries, observer) {
		for (const entry of entries) {
			callback(entry);
		}
	};

	// 当观察到变动时执行的回调函数
	let fn = observerFunc;
	if (options.enableFrame) {
		fn = (...args) => {
			window.requestAnimationFrame(() => observerFunc(...args));
		};
	} else if (throttleTime != null) {
		fn = throttle(observerFunc, throttleTime, { leading: true, trailing: true });
	} else if (debounceTime != null) {
		fn = debounce(observerFunc, debounceTime, { leading: true, trailing: true });
	}

	// 创建一个观察器实例并传入回调函数
	const observer = new ResizeObserver(fn);

	// 以上述配置开始观察目标节点
	observer.observe(targetNode);

	return function destroy() {
		observer.disconnect();
	};
};
