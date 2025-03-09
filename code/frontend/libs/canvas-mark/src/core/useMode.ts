import { Func, MarkInternalParams, RenderMode } from '../types';
import { calcPositionByWidth, calcPositionByMaxWidth, calcPositionByHeight } from '../utils/page';

export const useRenderMode = (params: MarkInternalParams) => {
	const getMode = () => params.mode;
	const setMode = (modeType: RenderMode, forceEmit = true) => {
		const prev = params.mode;
		params.mode = modeType;
		switch (modeType) {
			case 'max-width':
				params.getLocation = calcPositionByMaxWidth;
				break;
			case 'max-height':
				params.getLocation = calcPositionByHeight;
				break;
			default:
				params.getLocation = calcPositionByWidth;
		}
		if (forceEmit || modeType !== prev) {
			params.markOptions?.onModeChange?.(modeType, prev);
			params.getMarkInstance()?.emit('modeChange', [modeType, prev]);
		}
	};

	return { getMode, setMode };
};
