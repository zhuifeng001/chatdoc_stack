/**
 * 计算多边形的中心点
 * @param points
 * @returns
 */
export const calculatePolygonCenter = (points: number[]): [number, number] => {
	// 计算顶点数量
	const vertexCount = Math.floor(points.length / 2);

	// 初始化坐标总和
	let sumX = 0;
	let sumY = 0;

	// 计算坐标总和
	for (let i = 0; i < points.length; i++) {
		if (i & 1) {
			sumY += points[i];
		} else {
			sumX += points[i];
		}
	}

	// 计算平均值
	const avgX = sumX / vertexCount;
	const avgY = sumY / vertexCount;

	// 返回中心点坐标
	return [avgX, avgY];
};

/**
 * 获取包含多边形的最小矩形
 * @param points
 * @returns
 */
export const getMinRectByPolygon = (points: number[]): number[] => {
	let minX = points[0];
	let maxX = points[0];
	let minY = points[1];
	let maxY = points[1];
	for (let i = 2; i < points.length; i++) {
		if (i & 1) {
			// 偶数
			minY = Math.min(minY, points[i]);
			maxY = Math.max(maxY, points[i]);
		} else {
			// 奇数
			minX = Math.min(minX, points[i]);
			maxX = Math.max(maxX, points[i]);
		}
	}
	return [minX, minY, maxX, minY, maxX, maxY, minX, maxY];
};
