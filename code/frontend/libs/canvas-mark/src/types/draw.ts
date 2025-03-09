import { CanvasRectInstance, CanvasImageInstance, CanvasBadgeInstance, CanvasBadgeOptions, CanvasRectOptions, ShapeOptions } from '.';

export type MarkDrawShapeOptions = {
	index?: number;
	position: number[];
	data?: any;
	options?: Partial<ShapeOptions>;
};
export type MarkDrawBadgeOptions = {
	x: number;
	y: number;
	text: string;
	data?: any;
	options?: Partial<CanvasBadgeOptions>;
};

export type MarkDrawShapeParams = {
	visible?: boolean;
};

export type MarkScrollIntoViewOptions = {
	threshold?: number;
} & ScrollIntoViewOptions;
