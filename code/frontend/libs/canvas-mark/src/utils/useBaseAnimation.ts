import { useFramePromise } from './canvas';
import { Func } from '../types';

export type AnimationOptions = {
	duration: number;
	callback: Func<[number, any?, any?]>;
	easing?: Func<[x: number], number>;
};

function easeOutCirc(x: number): number {
	return Math.sqrt(1 - Math.pow(x - 1, 2));
}

function easeAverage(x: number): number {
	return x;
}

export const useBaseAnimation = (options: AnimationOptions) => {
	const { callback, duration, easing = easeAverage } = options;
	let start: number | null = null;
	let elapsed = 0;
	let progress = 0;

	const init = () => {
		start = null;
		elapsed = 0;
		progress = 0;
	};

	const destroy = () => {
		progress = 1;
		init();
	};

	const tick = async () => {
		if (start == null) {
			start = Date.now();
		}

		elapsed = Date.now() - start;
		progress = elapsed / duration;
		progress = easing(progress);

		if (Number(progress.toFixed(5)) >= 1) {
			await callback?.(1);
			return false;
		}

		if ((await callback?.(progress)) === false) return false;

		await useFramePromise(tick);
	};

	const restart = () => {
		init();
		tick();
	};

	return { tick, restart, init, destroy };
};
