import { Func, WorkerImageRes } from '@/types';

type DownloadRes = WorkerImageRes<string | Blob>;

interface DownloadReq {
	callback?: Func<[DownloadRes]>; // worker 回调
	base64?: boolean; // 是否返回base64
}

export const parseFileToBase64 = (file: File | Blob): Promise<string> => {
	const reader = new FileReader();
	reader.readAsDataURL(file);
	return new Promise(resolve => {
		reader.onload = (eve: any) => {
			resolve(eve.target.result);
		};
	});
};

/**
 * 需要同步 workers/download-image.worker.ts 中的 downloadImage 方法
 */
export const downloadImage = async (src: string, headers?: Record<string, string>, options?: DownloadReq) => {
	const originSrc = src;
	const ret: WorkerImageRes = { src: originSrc, data: src };
	if (!src) return ret;
	if (src.startsWith('blob:') || src.startsWith('data:')) {
		options?.callback?.(ret);
		return ret;
	}
	// 如果没有host，加上默认origin
	if (src.startsWith('/')) {
		src = location.origin + src;
	}
	const res = await fetch(src, {
		method: 'GET',
		headers: new Headers(headers),
	});
	const resHeaders = {};
	res.headers.forEach((value, key) => {
		resHeaders[key] = value;
	});
	// 返回的是图片
	if (resHeaders['content-type']?.includes('image')) {
		try {
			const blob = await res.blob();
			if (options?.base64) {
				const base64 = await parseFileToBase64(blob);
				const ret: WorkerImageRes = { src: originSrc, data: base64, headers: resHeaders, type: res.type };
				options?.callback?.(ret);
				return ret;
			}
			const ret: DownloadRes = { src: originSrc, data: blob, headers: resHeaders, type: res.type };
			options?.callback?.(ret);
			return ret;
		} catch (error) {
			console.log('download blob error', error);
		}
	}
	// 其他都是文本直接返回
	else {
		try {
			const content = await res.text();
			const ret: WorkerImageRes = { src: originSrc, data: content, headers: resHeaders, type: res.type };
			options?.callback?.(ret);
			return ret;
		} catch (error) {
			console.log('download content error', error);
		}
	}
	return ret;
};
