import { cutTriangles } from './cutTriangles';

export const isIntersectInPath = (position1: number[], position2: number[]) => {
	const [p1x1, p1y1, p1x2, p1y2, p1x3, p1y3, p1x4, p1y4] = position1;
	const [p2x1, p2y1, p2x2, p2y2, p2x3, p2y3, p2x4, p2y4] = position2;
	const lines1 = genLinesByPoints(position1);
	const lines2 = genLinesByPoints(position2);
	// 验证边是否有相交
	for (const line1 of lines1) {
		for (const line2 of lines2) {
			if (isIntersectForLine(line1, line2)) {
				return true;
			}
		}
	}
	// 验证点是否有包含
	return (
		isPointInPath(position1, [p2x1, p2y1]) ||
		isPointInPath(position1, [p2x2, p2y2]) ||
		isPointInPath(position1, [p2x3, p2y3]) ||
		isPointInPath(position1, [p2x4, p2y4]) ||
		isPointInPath(position2, [p1x1, p1y1]) ||
		isPointInPath(position2, [p1x2, p1y2]) ||
		isPointInPath(position2, [p1x3, p1y3]) ||
		isPointInPath(position2, [p1x4, p1y4])
	);
};

export const isIntersectForLine = (line1: [[number, number], [number, number]], line2: [[number, number], [number, number]]) => {
	const [[l1x1, l1y1], [l1x2, l1y2]] = line1; // 线段 a1 , b1
	const [[l2x1, l2y1], [l2x2, l2y2]] = line2; // 线段 a2 , b2
	const a1b1V = new Vector2D(l1x1 - l1x2, l1y1 - l1y2); // 向量 a1b1
	const a1a2V = new Vector2D(l1x1 - l2x1, l1y1 - l2y1); // 向量 a1a2
	const a1b2V = new Vector2D(l1x1 - l2x2, l1y1 - l2y2); // 向量 a1b2
	// a1b1V 叉乘 a1a2V
	const c1 = a1b1V.x * a1a2V.y - a1a2V.x * a1b1V.y;
	// a1b1V 叉乘 a1b2V
	const c2 = a1b1V.x * a1b2V.y - a1b2V.x * a1b1V.y;

	const a2b2V = new Vector2D(l2x1 - l2x2, l2y1 - l2y2); // 向量 a2b2
	const a2a1V = new Vector2D(l2x1 - l1x1, l2y1 - l1y1); // 向量 a2a1
	const a2b1V = new Vector2D(l2x1 - l1x2, l2y1 - l1y2); // 向量 a2b1
	// a2b2V 叉乘 a2a1V
	const c3 = a2b2V.x * a2a1V.y - a2a1V.x * a2b2V.y;
	// a2b2V 叉乘 a2b1V
	const c4 = a2b2V.x * a2b1V.y - a2b1V.x * a2b2V.y;

	// 符号相反表示相交
	return c1 * c2 <= 0 && c3 * c4 <= 0;
};

export function genVerticesByPoints(points: number[]): [number, number][] {
	return points.reduce((t: [number, number][], o) => {
		let arr: number[];
		if (!(arr = t[t.length - 1])) {
			arr = [];
			t.push(arr as [number, number]);
		}
		if (arr.length < 2) arr.push(o);
		else t.push([o] as unknown as [number, number]);
		return t;
	}, []);
}

export function genLinesByPoints(points: number[]) {
	const vertices = genVerticesByPoints(points);
	const lines: [[number, number], [number, number]][] = [];
	for (let i = 0; i < vertices.length; i++) {
		const curr = vertices[i];
		const next = i + 1 >= vertices.length ? vertices[0] : vertices[i + 1];
		lines.push([curr, next]);
	}
	return lines;
}

function inTriangle(p1: Vector2D, p2: Vector2D, p3: Vector2D, point: Vector2D) {
	const a = p2.copy().sub(p1);
	const b = p3.copy().sub(p2);
	const c = p1.copy().sub(p3);

	const u1 = point.copy().sub(p1);
	const u2 = point.copy().sub(p2);
	const u3 = point.copy().sub(p3);

	const s1 = Math.sign(a.cross(u1));
	let p = a.dot(u1) / a.length ** 2;
	if (s1 === 0 && p >= 0 && p <= 1) return true;

	const s2 = Math.sign(b.cross(u2));
	p = b.dot(u1) / b.length ** 2;
	if (s2 === 0 && p >= 0 && p <= 1) return true;

	const s3 = Math.sign(c.cross(u3));
	p = c.dot(u1) / c.length ** 2;
	if (s3 === 0 && p >= 0 && p <= 1) return true;

	return s1 === s2 && s2 === s3;
}

export function isPointInPath(points: number[], point: [number, number]) {
	const triangles = cutTriangles(points);
	const vertices: number[][] = genVerticesByPoints(points);
	const cells = new Uint16Array(triangles);
	let ret = false;
	for (let i = 0; i < cells.length; i += 3) {
		const p1 = new Vector2D(...vertices[cells[i]]);
		const p2 = new Vector2D(...vertices[cells[i + 1]]);
		const p3 = new Vector2D(...vertices[cells[i + 2]]);
		if (inTriangle(p1, p2, p3, new Vector2D(point[0], point[1]))) {
			ret = true;
			break;
		}
	}
	return ret;
}

export class Vector2D extends Array {
	constructor(x = 1, y = 0) {
		// @ts-ignore
		super(x, y);
	}

	set x(v) {
		this[0] = v;
	}

	set y(v) {
		this[1] = v;
	}

	get x() {
		return this[0];
	}

	get y() {
		return this[1];
	}

	get length() {
		return Math.hypot(this.x, this.y);
	}

	get dir() {
		return Math.atan2(this.y, this.x);
	}

	copy() {
		return new Vector2D(this.x, this.y);
	}

	add(v: Vector2D) {
		this.x += v.x;
		this.y += v.y;
		return this;
	}

	sub(v: Vector2D) {
		this.x -= v.x;
		this.y -= v.y;
		return this;
	}

	scale(a: number) {
		this.x *= a;
		this.y *= a;
		return this;
	}

	cross(v: Vector2D) {
		return this.x * v.y - v.x * this.y;
	}

	dot(v: Vector2D) {
		return this.x * v.x + v.y * this.y;
	}

	normalize() {
		return this.scale(1 / this.length);
	}

	rotate(rad: number) {
		const c = Math.cos(rad),
			s = Math.sin(rad);
		const [x, y] = this;

		this.x = x * c + y * -s;
		this.y = x * s + y * c;

		return this;
	}
}
