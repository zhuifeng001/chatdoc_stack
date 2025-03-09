import { getDevicePixelRatio, isSafari } from './device';
import { CanvasImageOptions, CanvasRectOptions, CanvasPolygonOptions, Func, ImageSrc, WorkerImageRes } from '../types';
import { getTransformBy2d } from './util';
import { formatAngle, rotateImageByCanvas, transformCanvas2Image } from './rotate';
import { downloadImageWorkerFunc } from '../workers/download-image.worker';
import { createWorker } from '../workers';
import { downloadImage } from './image';

export const imageCache = new Map<ImageSrc, HTMLImageElement | Promise<HTMLImageElement>>();
export const imageElementCache = new WeakMap<HTMLImageElement, Map<number, HTMLImageElement | HTMLCanvasElement>>();

const createImageNode = (src: string, originSrc: ImageSrc) => {
	const prevImage = imageCache.get(originSrc);
	if (!(prevImage instanceof Promise)) {
		return imageCache.get(originSrc) as HTMLImageElement;
	}

	const image = new Image();
	image.src = src;
	image.setAttribute('crossOrigin', 'anonymous');
	imageCache.set(originSrc, image);
	return image;
};
export const loadImage = (
	src: ImageSrc,
	getUrlHeader?: () => Record<string, any>,
	formatUrl?: (res: WorkerImageRes<string | Blob>) => string,
	enableWorker: boolean = true
) => {
	let image = imageCache.get(src) as HTMLImageElement;
	if (image) return image;

	if (typeof src === 'function') {
		const srcData = src();
		if (srcData instanceof Promise) {
			const p = srcData.then(data => {
				return createImageNode(data, src);
			});
			imageCache.set(src, p);
			return p;
		} else {
			return createImageNode(srcData, src);
		}
	}

	let loadPromise;
	// 使用web worker多线程下载
	if (enableWorker) {
		const downloadImageWorker = createWorker(downloadImageWorkerFunc);
		if (downloadImageWorker) {
			downloadImageWorker.onerror = e => {
				console.log('worker onerror', e);
			};
			loadPromise = new Promise<HTMLImageElement>(resolve => {
				const postProcess = (e: MessageEvent) => {
					const { src: originSrc, data: imgSrc } = e.data as WorkerImageRes;
					// 判断是当前的src
					if (src === originSrc) {
						const image = createImageNode(formatUrl ? formatUrl(e.data) : imgSrc, src);
						resolve(image);
						downloadImageWorker.removeEventListener('message', postProcess);
					}
				};

				downloadImageWorker.addEventListener('message', postProcess);

				downloadImageWorker.postMessage({
					type: 'download',
					data: {
						id: String(src),
						src: src,
						headers: getUrlHeader?.(),
					},
				});
			});
		}
	} else {
		// 正常下载
		loadPromise = new Promise<HTMLImageElement>(async resolve => {
			const ret = (await downloadImage(src, getUrlHeader?.())) as WorkerImageRes;
			const { src: originSrc, data: imgSrc } = ret;
			if (src === originSrc) {
				const image = createImageNode(formatUrl ? formatUrl(ret) : imgSrc, src);
				resolve(image);
			}
		});
	}

	imageCache.set(src, loadPromise);
	return loadPromise;
};

export const drawImage = async (canvas: HTMLCanvasElement, imageOptions: CanvasImageOptions) => {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	let { src, getUrlHeader, formatUrl, enableWorker, left, top, width, height, angle, border, first, last } = imageOptions;
	const draw = async (image: HTMLImageElement) => {
		angle ??= 0;

		let imageAngleCache = imageElementCache.get(image);
		if (!imageAngleCache) {
			imageAngleCache = new Map();
			imageElementCache.set(image, imageAngleCache);
		}
		angle = formatAngle(angle);
		let imageElement = imageAngleCache?.get(angle);
		if (!imageElement) {
			if (angle === 0) {
				imageElement = image;
			} else {
				imageElement = rotateImageByCanvas(image, angle);
				if (isSafari()) {
					//!!! safari 不支持 ctx.drawImage(canvas)
					imageElement = await transformCanvas2Image(imageElement);
				}
			}
			imageAngleCache.set(angle, imageElement);
		}

		let dw = 0;
		let dh = 0;
		if (width && height) {
			dw = width;
			dh = height;
		} else if (width) {
			dw = width;
			dh = (width / image.width) * image.height;
		} else if (height) {
			dw = (height / image.height) * image.width;
			dh = height;
		}

		ctx.save();

		if (border) {
			const lineWidth = border.lineWidth || 1;
			drawRect(ctx, {
				left: left,
				top: top,
				width: width,
				height: height,
				...border,
				strokeStyle: border.strokeStyle || '#D76365',
				lineWidth: lineWidth || 1,
				first,
				last,
			} as any);
		}

		ctx.drawImage(imageElement, left, top, dw, dh);

		ctx.restore();
	};

	const waitAndDraw = (image: HTMLImageElement) => {
		if (!image) return;
		if (image.complete) {
			return draw(image);
		}
		return new Promise(async (resolve: Func) => {
			image.onload = async () => {
				resolve(await draw(image));
			};
		});
	};

	let imagePromise = loadImage(src, getUrlHeader, formatUrl, enableWorker);
	if (imagePromise instanceof Promise) {
		return waitAndDraw(await imagePromise);
	} else {
		return waitAndDraw(imagePromise);
	}
};

export const drawRect = (ctx: CanvasRenderingContext2D, options: Omit<CanvasRectOptions, 'type'>) => {
	ctx.save();
	ctx.beginPath();

	const shadow = options.shadow;
	if (shadow) {
		for (const key in shadow) {
			ctx[key] = shadow[key];
		}
	} else {
		ctx.shadowBlur = 0;
	}

	const lineWidth = options.lineWidth ?? 1;
	ctx.lineWidth = lineWidth;

	const devicePixelRatio = getDevicePixelRatio();
	let x = Math.round(options.left);
	let y = Math.round(options.top);
	let width = Math.round(options.width);
	let height = Math.round(options.height);

	let offsetLeft = x - (lineWidth * devicePixelRatio) / 2;
	let offsetLeftFloor = Math.floor(offsetLeft);
	let offsetX = offsetLeft - offsetLeftFloor;
	x += offsetX;

	let offsetTop = y - (lineWidth * devicePixelRatio) / 2;
	let offsetTopFloor = Math.floor(offsetTop);
	let offsetY = offsetTop - offsetTopFloor;
	y += offsetY;

	if (options.lineDash) {
		ctx.setLineDash(options.lineDash);
	}

	if (options.fillStyle) {
		ctx.fillStyle = options.fillStyle;
		ctx.fillRect(x, y, width, height);
	}

	ctx.strokeStyle = options.strokeStyle ?? 'green';
	if (options.borderPlacement?.length) {
		const [paddingTop, paddingRight, paddingBottom, paddingLeft] = options.padding || [0, 0, 0, 0];
		// border线条
		for (const placement of options.borderPlacement) {
			if (placement === 'left') {
				ctx.moveTo(x - paddingLeft, y);
				ctx.lineTo(x - paddingLeft, y + height);
			}
			if (placement === 'right') {
				ctx.moveTo(x + width + paddingRight, y);
				ctx.lineTo(x + width + paddingRight, y + height);
			}
			if (!options.first && placement === 'top') {
				ctx.moveTo(x, y - paddingTop);
				ctx.lineTo(x + width, y - paddingTop);
			}
			if (!options.last && placement === 'bottom') {
				ctx.moveTo(x, y + height + paddingBottom);
				ctx.lineTo(x + width, y + height + paddingBottom);
			}
			ctx.stroke();
		}
	} else {
		// border矩形
		ctx.strokeRect(x, y, width, height);
	}

	ctx.restore();
};

export const drawPolygon = (ctx: CanvasRenderingContext2D, options: Omit<CanvasPolygonOptions, 'type'>) => {
	ctx.save();
	ctx.beginPath();

	const pos = options.position;
	ctx.moveTo(pos[0], pos[1]);
	for (let i = 2; i < pos.length; i += 2) {
		ctx.lineTo(pos[i], pos[i + 1]);
	}
	ctx.closePath();

	const shadow = options.shadow;
	if (shadow) {
		for (const key in shadow) {
			ctx[key] = shadow[key];
		}
	} else {
		ctx.shadowBlur = 0;
	}

	const lineWidth = options.lineWidth ?? 1;
	ctx.lineWidth = lineWidth;

	const devicePixelRatio = getDevicePixelRatio();
	const [left, top] = options.position;
	let x = Math.round(left);
	let y = Math.round(top);

	let offsetLeft = x - (lineWidth * devicePixelRatio) / 2;
	let offsetLeftFloor = Math.floor(offsetLeft);
	let offsetX = offsetLeft - offsetLeftFloor;
	x += offsetX;

	let offsetTop = y - (lineWidth * devicePixelRatio) / 2;
	let offsetTopFloor = Math.floor(offsetTop);
	let offsetY = offsetTop - offsetTopFloor;
	y += offsetY;

	if (options.lineDash) {
		ctx.setLineDash(options.lineDash);
	}

	if (options.fillStyle) {
		ctx.fillStyle = options.fillStyle;
		ctx.fill();
	}

	ctx.strokeStyle = options.strokeStyle ?? 'green';
	ctx.stroke();

	ctx.restore();
};
