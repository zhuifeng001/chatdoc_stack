'use client';

import { MarkInstance, MarkInitOptions, RenderMode, createMark, PageItem, MarkOptions } from 'canvas-mark';
import { useResizeListener } from '@/utils/util';
import { ForwardedRef, forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { Func } from '@/types';
import styles from './mark.module.less';
import { PageMarkItem } from './types';

export interface MarkProps {
	options?: Partial<MarkOptions>;
	pages: PageMarkItem[];
	pageIndex?: number;
	onPageChange?: (page: number, pageItem?: PageItem) => void;
	mode?: RenderMode;
	getLocation?: (pageItem: PageItem) => any;
	onMarkNoHover?: Func;
	onMarkHover?: Func;
	onMarkClick?: Func;
	onMarkLeave?: Func;
	onMarkRightClick?: Func;
	onDrawStart?: Func;
	onDrawComplete?: Func;
	onDrawCancel?: Func;
	onDrawChange?: Func;
	onDrawRemove?: Func;
	onInit?: Func;
}

export type MarkExportProps = MarkInstance;

export default forwardRef<MarkExportProps, MarkProps>(function Mark(props: MarkProps, ref) {
	const {
		options = {},
		pages,
		getLocation,
		mode,
		onInit,
		onPageChange,
		onMarkNoHover,
		onMarkHover,
		onMarkLeave,
		onMarkClick,
		onMarkRightClick,
		onDrawComplete,
	} = props;
	const instance = useRef<MarkInstance>();
	let containerResizeDestroy: Func | undefined;
	const containerRef = useRef<any>();

	useImperativeHandle(ref, () => {
		return {
			init: (...args: Parameters<MarkInstance['init']>) => instance.current?.init(...args),
			destroy: () => instance.current?.destroy(),
			reset: () => instance.current?.reset(),
			render: (...args: Parameters<MarkInstance['render']>) => instance.current?.render(...args),
			enableDrawShape: (...args: Parameters<MarkInstance['enableDrawShape']>) => instance.current?.enableDrawShape(...args),
			cancelDrawShape: (...args: Parameters<MarkInstance['cancelDrawShape']>) => instance.current?.cancelDrawShape(...args),
			setMode: (...args: Parameters<MarkInstance['setMode']>) => instance.current?.setMode(...args),
			changePage: (...args: Parameters<MarkInstance['changePage']>) => instance.current?.changePage(...args),
			drawRect: (...args: Parameters<MarkInstance['drawRect']>) => instance.current?.drawRect(...args),
			removeRect: (...args: Parameters<MarkInstance['removeRect']>) => instance.current?.removeRect(...args),
			getInternalPage: (...args: Parameters<MarkInstance['getInternalPage']>) => instance.current?.getInternalPage(...args),
			setScaleByRadio: (...args: Parameters<MarkInstance['setScaleByRadio']>) => instance.current?.setScaleByRadio(...args),
			queryState: (...args: Parameters<MarkInstance['queryState']>) => instance.current?.queryState(...args),
			getPageState: (...args: Parameters<MarkInstance['getPageState']>) => instance.current?.getPageState(...args),
			queryAllState: (...args: Parameters<MarkInstance['queryAllState']>) => instance.current?.queryAllState(...args),
			setActive: (...args: Parameters<MarkInstance['setActive']>) => instance.current?.setActive(...args),
			getActive: (...args: Parameters<MarkInstance['getActive']>) => instance.current?.getActive(...args),
		} as any;
	});

	const initMark = useCallback(() => {
		instance.current = createMark({
			...options,
			selector: containerRef.current,
			pages: pages as any[],
			multiple: true,
			mode,
			getLocation,
			onChangePage(i: number, pageItem: any) {
				onPageChange?.(i, pageItem);
			},
			onContainerSizeChange() {},
			onTranslateChange() {},
			onMarkHover,
			onMarkLeave,
			onMarkNoHover,
			onMarkClick,
			onMarkRightClick,
			onDrawComplete,
		});
		if (!instance.current) return;

		const { init, rerender } = instance.current;
		init();
		onInit?.(instance.current);
		// eslint-disable-next-line react-hooks/rules-of-hooks
		containerResizeDestroy = useResizeListener(containerRef.current, rerender, { enableFrame: true });
	}, []);

	useEffect(() => {
		initMark();
		return containerResizeDestroy;
	}, [pages]);

	return <div ref={containerRef} className={styles['mark-container']}></div>;
});
