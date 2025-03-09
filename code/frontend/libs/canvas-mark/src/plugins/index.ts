import { MarkInstance, MarkInternalParams, MarkOptions } from '..';

export interface PluginProps {
	canvas: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
	markInstance: MarkInstance;
	markOptions: MarkOptions;
	markParams: MarkInternalParams;
}

export type MarkPlugin = (props: PluginProps) => {
	name: string;
	init: () => void;
	destroy: () => void;
	[key: string]: any;
};

export type DrawActionState = {
	draw: boolean;
	drag: boolean;
	canDrawingInShape: boolean;
};

export type DrawOptions = {
	getState: () => Readonly<DrawActionState>;
	setState: (mewState: Partial<DrawActionState>) => void;
};
