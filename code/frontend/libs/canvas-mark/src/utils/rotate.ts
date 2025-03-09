export const formatAngle = (angle: number) => ((angle % 360) + 360) % 360;

/**
 * x2 = x1 * cosA - y1 * sinA
 * y2 = x1 * sinA + y1 * cosA
 * @param param0
 * @param angle
 * @returns
 */
export const rotatePointBase = ([x1, y1]: [number, number], angle: number): [number, number] => {
	const rad = (angle * Math.PI) / 180;
	const c = Math.cos(rad);
	const s = Math.sin(rad);
	return [Math.round(x1 * c + y1 * -s), Math.round(x1 * s + y1 * c)];
};

export const rotatePointsBase = (position: number[], angle: number) => {
	if (position.length % 2) return position;

	const res: number[] = [];
	for (let i = 0; i < position.length; i += 2) {
		res.push(...rotatePointBase([position[i], position[i + 1]], angle));
	}
	return res;
};

export const rotatePoint = (point: [number, number], angle: number, width: number, height: number): [number, number] => {
	const [x2, y2] = rotatePointBase(point, angle);
	return [x2, y2];
};

export const rotatePoints = (position: number[], angle: number) => {
	if (position.length % 2) return position;
	angle = formatAngle(angle);
	return rotatePointsBase(position, angle);
};

/**
 * 旋转点位
 * @param position
 * @param angle
 * @param width
 * @param height
 */
export const rotatePointsWithPage = (position: number[], angle: number, width: number, height: number) => {
	if (position.length % 2) return position;
	angle = formatAngle(angle);
	let res: number[] = [];
	const getValue = (i: number, num: number) => {
		if (i & 1) {
			// 偶数位  top
			let y = num;
			if (angle === 90) {
				return y;
			} else if (angle === 180) {
				return y + height;
			} else if (angle === 270) {
				return y + width;
			}
			return y;
		} else {
			// 奇数位  left
			let x = num;
			if (angle === 90) {
				return x + height;
			} else if (angle === 180) {
				return x + width;
			} else if (angle === 270) {
				return x;
			}
			return x;
		}
	};
	for (let i = 0; i < position.length; i += 2) {
		let [x2, y2] = rotatePointBase([position[i], position[i + 1]], angle);
		res.push(getValue(i, x2), getValue(i + 1, y2));
	}

	const swap = (arr: number[], i: number, j: number) => {
		let temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	};

	if (angle === 180) {
		swap(res, 0, 4);
		swap(res, 1, 5);
		swap(res, 2, 6);
		swap(res, 3, 7);
	} else if (angle === 90) {
		swap(res, 0, 4);
		swap(res, 3, 7);
	} else if (angle === 270) {
		swap(res, 1, 5);
		swap(res, 2, 6);
	}
	return res;
};

/**
 * 顺时针选择角度
 * @param url
 * @param angle
 * @returns
 */
export const rotateImage = (url: string, angle: any) => {
	if (!formatAngle(angle)) return url;

	const imageNode = new Image();
	imageNode.src = url;
	return new Promise<HTMLCanvasElement>((resolve, reject) => {
		imageNode.onload = function () {
			const canvas = rotateImageByCanvas(imageNode, angle);
			resolve(canvas);
		};
		imageNode.onerror = function (e) {
			reject(e);
		};
	});
};

/**
 * 逆时针旋转图片
 */
export const rotateImageByCanvas = (img: HTMLImageElement, angle: number): HTMLCanvasElement => {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	if (img === null || !ctx) return canvas;
	angle = formatAngle(angle);

	const width = img.width;
	const height = img.height;

	// 旋转角度以弧度值为参数
	const degree = (angle * Math.PI) / 180;
	const c = Math.cos(degree);
	const s = Math.sin(degree);
	const rotatedWidth = Math.abs(c * width + s * height);
	const rotatedHeight = Math.abs(s * width + c * height);
	canvas.width = rotatedWidth;
	canvas.height = rotatedHeight;
	ctx.rotate(degree);

	switch (angle) {
		case 0:
			ctx.drawImage(img, 0, 0, width, height);
			break;
		case 90:
			ctx.drawImage(img, 0, -height, width, height);
			break;
		case 180:
			ctx.drawImage(img, -width, -height, width, height);
			break;
		case 270:
			ctx.drawImage(img, -width, 0, width, height);
			break;
	}
	return canvas;
};

export const transformCanvas2Image = (canvas: HTMLCanvasElement) => {
	const base64Str = canvas.toDataURL('image/png');
	const image = new Image();
	image.src = base64Str;
	return new Promise<HTMLImageElement>((resolve, reject) => {
		image.onload = () => {
			resolve(image);
		};
		image.onerror = () => {
			reject(new Error('Failed to load image'));
		};
	});
};
