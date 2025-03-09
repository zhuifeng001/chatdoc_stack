/**
 * 使用标准规范事件 wheel ，兼容 IE
 * @param event
 * @returns
 */
export const getWheelDeltaY = (event: WheelEvent) => {
	return event.deltaY;
};
