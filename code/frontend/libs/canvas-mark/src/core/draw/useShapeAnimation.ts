import { CanvasRectInstance, CanvasRectOptions, Func, RectStandardPosition, ShapeInstance, ShapeOptions, ShapePosition } from '@/types';
import { useBaseAnimation } from '../../utils/useBaseAnimation';
import { useFramePromise } from '../../utils/canvas';
import { useDefaultRectAnimationHandler } from '../useRectAnimation';

export type AnimationKeyframe<T extends ShapePosition = ShapePosition, S extends ShapeInstance = ShapeInstance> = {
	percent: number; // 百分比，0 - 1之间
	state: [S, T][];
};

export type AnimationHandler<T extends ShapePosition = ShapePosition, S extends ShapeInstance = ShapeInstance> = (
	options: AnimationOptions<T, S>
) => {
	init: Func;
	destroy: Func;
	restore: Func;
	run: (startKeyframe: AnimationKeyframe<T, S>, endKeyframe: AnimationKeyframe<T, S>, progress: number) => void;
};

export type AnimationOptions<T extends ShapePosition = ShapePosition, S extends ShapeInstance = ShapeInstance> = {
	duration: number;
	keyframes: AnimationKeyframe<T, S>[];
	render: Func;
	handler: AnimationHandler<T, S>;
};

export const useShapeAnimation = <T extends ShapePosition = ShapePosition, S extends ShapeInstance = ShapeInstance>(
	options: AnimationOptions<T, S>
) => {
	const { keyframes, duration, render, handler } = options;
	const { init: init_1, destroy: destroy_1, restore: restore_1, run: run_1 } = handler(options);

	const init = () => {
		destroy();
		init_1();
	};

	const destroy = () => {
		destroy_1();
	};

	const restore = () => {
		restore_1();
	};

	const run = async () => {
		init();

		for (let i = 0; i < keyframes.length - 1; i++) {
			const startKeyframe = keyframes[i];
			const endKeyframe = keyframes[i + 1];

			const { tick, destroy: destroy_0 } = useBaseAnimation({
				duration: duration * (startKeyframe.percent || 0),
				callback(progress: number) {
					run_1(startKeyframe, endKeyframe, progress);
					render?.();
				},
			});
			await useFramePromise(tick);
			destroy_0();
		}
		restore();
		destroy();
	};

	return { run };
};
