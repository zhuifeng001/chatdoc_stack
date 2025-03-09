import { ShapeInstance } from '../../types';

export type DrawStateInstance = ReturnType<typeof useDrawState>;

export const useDrawState = () => {
	const drawState: ShapeInstance[] = [];

	const getState = () => {
		return drawState.slice();
	};
	const setState = (stateValue: ShapeInstance) => {
		if (drawState.includes(stateValue)) return;

		drawState.push(stateValue);
		// FIXED 排序，解决大框中不能点击小框，保证小框最后渲染
		drawState.sort((a, b) => {
			if (a.options.unshift) return -1;
			if (b.options.unshift) return 1;
			return b.options.top - a.options.top;
		});
	};
	const removeState = (stateValue?: ShapeInstance) => {
		if (!stateValue) {
			// clear all
			// drawState.forEach(item => item.destroy?.());
			drawState.length = 0;
			return;
		}
		// clear one
		const i = drawState.findIndex(item => item === stateValue);
		if (~i) {
			// stateValue.destroy?.();
			drawState.splice(i, 1);
		}
	};

	return { getState, setState, removeState };
};
