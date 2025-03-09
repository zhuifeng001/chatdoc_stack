import { DrawActionState, PluginProps } from '.';
import { CanvasRectOptions } from '..';
import { useDragShape } from './useDragShape';
import { useDrawRect } from './useDrawRect';

export const useDraw = (props: PluginProps) => {
	const state: DrawActionState = {
		draw: false,
		drag: false,
		canDrawingInShape: false,
	};
	const setState = (newState: Partial<DrawActionState>) => {
		Object.assign(state, newState);
	};
	const getState = () => Object.freeze({ ...state });

	const { enable: enableDrawRect, disable: disableDrawRect } = useDrawRect(props, { getState, setState });
	const { enable: enableDragShape, disable: disableDragShape } = useDragShape(props, { getState, setState });

	const enableDraw = (options?: CanvasRectOptions) => {
		setState({ draw: true });
		enableDrawRect(options);
	};

	const enableDrag = () => {
		setState({ drag: true });
		enableDragShape();
	};

	const enable = (options?: CanvasRectOptions) => {
		enableDraw(options);
		enableDrag();
	};

	const destroy = () => {
		setState({
			draw: false,
			drag: false,
		});
		disableDrawRect();
		disableDragShape();
	};

	return {
		name: 'Draw',
		enable,
		enableDraw,
		enableDrag,
		destroy,
		disable: destroy,
	};
};
