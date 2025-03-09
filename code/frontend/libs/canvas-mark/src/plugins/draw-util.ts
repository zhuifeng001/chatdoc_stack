import { MarkInstance, ShapeInstance } from '..';

/**
 *
 * @param options.point [event.offsetX, event.offsetY]
 */
export const isEventPointInShape = (options: { point: [number, number]; markInstance: MarkInstance }) => {
	const { point, markInstance } = options;
	const visibleInternalPages = markInstance.getInternalPagesByVisible() || [];
	let selectedShape: ShapeInstance | undefined;
	for (const internalPage of visibleInternalPages) {
		const shapesOfCurrPage = markInstance.queryAllState(undefined, internalPage);
		selectedShape = shapesOfCurrPage?.find(shape => shape.state.visible && shape.isInShapeRange(point));
		if (selectedShape) break;
	}
	return selectedShape;
};
