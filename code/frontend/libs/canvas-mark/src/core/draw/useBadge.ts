import { measureTextSize } from '../../utils/canvas';
import { CanvasBadgeOptions, CanvasBadgeInstance } from '../../types';
import { useShape } from './useShape';
import { inPolygonScope } from './util';
import { isRectVisible, transformRectSidePosition } from '../../utils/util';
import { drawPolygon } from '../../utils/useMarkUtil';

export const useBadge = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, options: CanvasBadgeOptions): CanvasBadgeInstance => {
	const instance = useShape<CanvasBadgeOptions>(canvas, ctx, options);
	const originUpdateOptions = instance.updateOptions;

	instance.isInShapeRange = (e: PointerEvent | [number, number]) => {
		const point = Array.isArray(e) ? e : ([e.offsetX, e.offsetY] as [number, number]);
		return inPolygonScope(canvas, instance.options.position, point);
	};

	instance.isVisible = () => {
		return isRectVisible(canvas, transformRectSidePosition(instance.options));
	};

	instance.render = () => {
		const { options } = instance;
		const fontSize = getFontSize() * (options._rate || 1);
		const padding = getPadding();
		const text = options.text ?? '';
		const font = `${fontSize}px caption`;
		let { width, height } = measureTextSize(ctx, text, font);
		width = width;
		height = height;

		const { badge, placement = 'left-top' } = options;
		// 画角标
		ctx.save();
		ctx.fillStyle = badge?.fillStyle || 'blue';

		let badgePos;
		let textPos;
		switch (placement) {
			case 'left-top':
				badgePos = {
					left: options.left - (width + padding * 2),
					top: options.top - (options?.lineWidth || 1) / 2,
					width: width + padding * 2,
					height: fontSize + padding * 2,
				};
				textPos = {
					left: options.left - (width + padding),
					top: options.top - (options?.lineWidth || 1) / 2 + padding,
				};
				break;
			case 'left-bottom':
				badgePos = {
					left: options.left - width - padding * 2,
					top: options.top + options.height + (options?.lineWidth || 1) / 2 - fontSize - padding * 2,
					width: width + padding * 2,
					height: fontSize + padding * 2,
				};
				textPos = {
					left: options.left - width - padding,
					top: options.top + options.height + (options?.lineWidth || 1) / 2 - fontSize - padding * 2 + padding,
				};
				break;
			case 'right-top':
				badgePos = {
					left: options.left + options.width,
					top: options.top - (options?.lineWidth || 1) / 2,
					width: width + padding * 2,
					height: fontSize + padding * 2,
				};
				textPos = {
					left: options.left + options.width + padding,
					top: options.top + padding - (options?.lineWidth || 1) / 2,
				};
				break;
			case 'right-bottom':
				badgePos = {
					left: options.left + options.width,
					top: options.top + options.height + (options?.lineWidth || 1) / 2 - fontSize - padding * 2,
					width: width + padding * 2,
					height: fontSize + padding * 2,
				};
				textPos = {
					left: options.left + options.width + padding,
					top: options.top + options.height + (options?.lineWidth || 1) / 2 - fontSize - padding * 2 + padding,
				};
				break;
		}

		ctx.fillRect(badgePos.left, badgePos.top, badgePos.width, badgePos.height);

		// 画文字
		ctx.font = font;
		ctx.fillStyle = badge?.color || 'white';
		ctx.textBaseline = badge?.textBaseline || 'hanging';

		ctx.fillText(text, textPos.left, textPos.top);
		ctx.restore();

		// 画矩形
		drawPolygon(ctx, instance.options);
	};

	const getFontSize = () => instance.options.fontSize ?? 14;
	const getPadding = () => instance.options.padding ?? 2;

	instance.updateOptions = (newOptions: Partial<CanvasBadgeOptions>) => {
		originUpdateOptions({
			...instance.options,
			...newOptions,
		});
	};

	// 自动注入宽度、高度
	instance.updateOptions(instance.options);

	return instance;
};
