/**
 * 4个点位转换为8个点位
 * @param position
 * @returns
 */
export const convertPositionBy4To8 = (position: number[]) => {
	if (!position?.length || position.length === 8) {
		return position;
	}
	const [x3, y3, x1, y1] = position || [];
	const [x0, y0, x2, y2] = [x3, y1, x1, y3];
	return [x0, y0, x1, y1, x2, y2, x3, y3];
};

/**
 * 8个点位转换为4个点位
 * @param position
 * @returns
 */
export const convertPositionBy8To4 = (position: number[]) => {
	if (!position?.length || position.length === 4) return position;
	return [position[6], position[7], position[2], position[3]];
};

/**
 * 合并两个点位
 * @param position1
 * @param position2
 * @returns
 */
export const mergeTwoPosition = (position1: number[], position2: number[]) => {
	return [
		Math.min(position1[0], position2[0]),
		Math.min(position1[1], position2[1]),
		Math.max(position1[2], position2[2]),
		Math.min(position1[3], position2[3]),
		Math.max(position1[4], position2[4]),
		Math.max(position1[5], position2[5]),
		Math.min(position1[6], position2[6]),
		Math.max(position1[7], position2[7]),
	];
};

/**
 * 按行合并多个点位
 * @param positions
 * @returns
 */
export const mergePositions = (positions: number[][]) => {
	const res: number[][] = [];
	let linePosition: number[] = convertPositionBy4To8(positions[0]);
	for (let i = 1; i < positions.length; i++) {
		const next = convertPositionBy4To8(positions[i]);
		/**
		 * 判断是否在一行
		 * 第一个点位的第四个点的纵坐标
		 * 小于
		 * 第二个点位的第一个点的纵坐标
		 * 就换行
		 */
		if (linePosition[7] < next[1]) {
			res.push(linePosition);
			linePosition = next;
			continue;
		}
		linePosition = mergeTwoPosition(linePosition, next);
	}
	res.push(linePosition);
	return res;
};
