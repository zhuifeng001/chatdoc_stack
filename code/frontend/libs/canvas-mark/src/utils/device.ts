// 判断是否是Windows
export const isWindows = () => {
	if (!navigator) return false;
	const userAgent = navigator.userAgent;
	return /Windows/.test(userAgent);
};

// 判断是否是Mac
export const isMac = () => {
	if (typeof window === 'undefined' || !window?.navigator) return false;
	const userAgent = navigator.userAgent;
	return /Macintosh/.test(userAgent);
};

export const getDevicePixelRatio = () => {
	return window.devicePixelRatio || 1;
};

export const isSafari = () => {
	if (typeof window === 'undefined' || !window?.navigator) return false;

	var userAgent = navigator.userAgent;
	// 检测是否为苹果设备
	var isAppleDevice = /Macintosh|iPhone|iPad|iPod/.test(userAgent);

	// 检测是否为Safari，同时排除Webkit内核的非Safari浏览器
	var isSafari = /Version\/[\d.]+.*Safari/.test(userAgent) && !/CriOS/.test(userAgent) && !/FxiOS/.test(userAgent);

	return isAppleDevice && isSafari;
};
