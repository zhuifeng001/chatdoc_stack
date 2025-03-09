type ConnectorPoint = {
	x: number;
	y: number;
};

type ConnectorLineStyle = {
	stroke?: string;
	strokeWidth?: string;
	strokeDasharray?: string;
	fill?: string;
};

type CreateArcLineOptions = {
	baseX?: number;
	radius?: number;
};

const namespaceUrl = 'http://www.w3.org/2000/svg';

const createNS = (name: string, attrs: Record<string, string> = {}) => {
	const node = document.createElementNS(namespaceUrl, name);
	for (const key in attrs) {
		node.setAttribute(
			key.replace(/[A-Z]/g, s => `-${s.toLowerCase()}`),
			attrs[key]
		);
	}
	return node;
};

const getDefaultLineStyle = () => ({
	stroke: 'green',
	strokeWidth: '2',
	fill: 'none',
	// strokeDasharray: '10, 6',
});

const mergeLineStyle = (lineStyle: ConnectorLineStyle = {}) => ({
	...getDefaultLineStyle(),
	...lineStyle,
});

const getOperator = (bool = false) => (bool ? 1 : -1);

export const useConnector = () => {
	let anchorPoint: ConnectorPoint | null = null;
	let targetPoint: ConnectorPoint | null = null;
	let svg: SVGElement | null = null;

	const createContainer = (attrs: Record<string, string> = {}) => {
		svg = createNS('svg', {
			class: 'line-connector',
			width: '100%',
			height: '100%',
			style: 'position: fixed; top: 0; left: 0; z-index: 9999; pointer-events: none;',
			...attrs,
		});
	};

	const createLine = (anchor: ConnectorPoint, target: ConnectorPoint, lineStyle: ConnectorLineStyle = {}) => {
		anchorPoint = anchor;
		targetPoint = target;

		createContainer();
		if (!svg) return;

		const line = createNS('line', {
			x1: String(anchor.x),
			y1: String(anchor.y),
			x2: String(target.x),
			y2: String(target.y),

			...mergeLineStyle(lineStyle),
		});
		svg.appendChild(line);
		document.body.appendChild(svg);
	};

	const createArcLine = (anchor: ConnectorPoint, target: ConnectorPoint, options?: CreateArcLineOptions, lineStyle: ConnectorLineStyle = {}) => {
		const { baseX = (anchor.x + target.x) / 2, radius: originRadius = 20 } = options ?? {};
		const minX = Math.min(anchor.x, target.x);
		const maxX = Math.max(anchor.x, target.x);
		if (baseX < minX || baseX > maxX) {
			console.warn('baseX is not in the range of anchor and target');
			return;
		}
		anchorPoint = anchor;
		targetPoint = target;
		createContainer();
		if (!svg) return;

		const radius = Math.min(Math.abs(anchor.y - target.y) / 2, originRadius);

		const style = mergeLineStyle(lineStyle);
		const positiveX = anchor.x - target.x < 0;
		const positiveY = anchor.y - target.y < 0;
		// 圆弧方向 0 顺时针 1 逆时针
		const sweepFlag = Number(positiveX) ^ Number(positiveY);
		const realBaseX1 = baseX - radius * getOperator(positiveX);
		const realBaseY1 = anchor.y + radius * getOperator(positiveY);
		const realBaseX2 = baseX + radius * getOperator(positiveX);
		const realBaseY2 = target.y - radius * getOperator(positiveY);

		// 直线
		const linePath1 = createNS('path', { d: `M ${anchor.x} ${anchor.y} L ${realBaseX1} ${anchor.y}`, ...style });
		// 圆弧
		const arcPath1 = createNS('path', {
			d: `M ${realBaseX1} ${anchor.y} A ${radius} ${radius} 0 0 ${Number(!sweepFlag)} ${baseX} ${realBaseY1}`,
			...style,
		});
		// 直线
		const linePath2 = createNS('path', { d: `M ${baseX} ${realBaseY1} L ${baseX} ${realBaseY2}`, ...style });
		// 圆弧
		const arcPath2 = createNS('path', {
			d: `M ${baseX} ${realBaseY2} A ${radius} ${radius} 0 0 ${sweepFlag} ${realBaseX2} ${target.y}`,
			...style,
		});
		// 直线
		const linePath3 = createNS('path', { d: `M ${realBaseX2} ${target.y} L ${target.x} ${target.y}`, ...style });

		svg.appendChild(linePath1);
		svg.appendChild(arcPath1);
		svg.appendChild(linePath2);
		svg.appendChild(arcPath2);
		svg.appendChild(linePath3);
		document.body.appendChild(svg);
	};

	const destroy = () => {
		anchorPoint = null;
		targetPoint = null;
    // svg?.remove();
    svg?.parentNode?.removeChild(svg);
		svg = null;
	};

	return { createLine, createArcLine, destroy };
};
