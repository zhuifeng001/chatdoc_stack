import { CanvasImageInstance, CanvasImageOptions } from '@/types';
import { InternalShapeMethodsOptions, useInternalShapeMethods } from './useInternalShapeMethods';
import { useImage } from './useImage';

export const useImageInternal = (
	canvas: HTMLCanvasElement,
	ctx: CanvasRenderingContext2D,
	options: CanvasImageOptions,
	internalOptions: InternalShapeMethodsOptions
): CanvasImageInstance => {
	const { markInstance, markParams, setup } = internalOptions;
	const instance = useImage(canvas, ctx, options);

	const methods = useInternalShapeMethods(canvas, instance, internalOptions);

	Object.assign(instance, {
		...methods,
	} as Partial<CanvasImageInstance>);

	const init = () => {
		setup?.(instance);
	};
	init();

	return instance;
};
