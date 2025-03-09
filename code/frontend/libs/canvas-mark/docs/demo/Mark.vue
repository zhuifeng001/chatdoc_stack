<template>
	<div class="mark-container"></div>
</template>

<script lang="ts">
import { PropType, defineComponent, getCurrentInstance, onBeforeUnmount, onMounted } from 'vue';
import { PageItem } from '@/components/mark/helpers/types';
import { type MarkInstance, type MarkInitOptions, type RenderMode, createMark } from 'canvas-mark';
import { useResizeListener } from '@/utils/util';
import { Func } from '@/types';

export default defineComponent({
	name: 'Mark',
	props: {
		options: {
			type: Object as PropType<MarkInitOptions>,
			default: () => ({}),
		},
		pages: {
			type: Array as PropType<PageItem[]>,
			default: () => [],
		},
		pageIndex: {
			type: Number,
			default: 1,
		},
		getLocation: {
			type: Function as PropType<(pageItem: any) => any>,
		},
		mode: {
			type: String as PropType<RenderMode>,
		},
	},
	setup(props) {
		const vm = getCurrentInstance()?.proxy as any;
		const { options, pages, getLocation, mode } = props;
		const instance = { value: null as MarkInstance | null };
		let containerResizeDestroy: Func | undefined;

		const initMark = () => {
			instance.value = createMark({
				...options,
				selector: vm.$el,
				pages: pages,
				multiple: true,
				mode,
				getLocation,
				onChangePage(i: number, pageItem: any) {
					vm.$emit('update:page-index', i);
					vm.$emit('change-page', i);
				},
				onContainerSizeChange() {},
				onTranslateChange() {},
				onMarkHover(shape: any) {
					vm.$emit('mark-hover', shape);
				},
				onMarkLeave(shape: any) {
					vm.$emit('mark-leave', shape);
				},
				onMarkNoHover(e) {},
				onMarkClick(shape: any, e: Event) {
					console.log('shape :>> ', shape);
					vm.$emit('mark-click', shape);
				},
				onMarkRightClick(shape: any) {
					vm.$emit('mark-right-click', shape);
				},
				onDrawComplete(shape: any) {
					// console.log('onDrawComplete data :>> ', shape);
				},
			});
			if (!instance.value) return;

			const { init, rerender } = instance.value;
			init();
			vm.$emit('init', instance.value);
			containerResizeDestroy = useResizeListener(vm.$el, rerender, { enableFrame: true });
		};

		onMounted(() => {
			initMark();
		});

		onBeforeUnmount(() => {
			containerResizeDestroy?.();
		});

		return {
			init: () => instance.value?.init(),
			destroy: () => instance.value?.destroy(),
			reset: () => instance.value?.reset(),
			render: (...args: Parameters<MarkInstance['render']>) => instance.value?.render(...args),
			enableDrawShape: (...args: Parameters<MarkInstance['enableDrawShape']>) => instance.value?.enableDrawShape(...args),
			cancelDrawShape: (...args: Parameters<MarkInstance['cancelDrawShape']>) => instance.value?.cancelDrawShape(...args),
			setMode: (...args: Parameters<MarkInstance['setMode']>) => instance.value?.setMode(...args),
			changePage: (...args: Parameters<MarkInstance['changePage']>) => instance.value?.changePage(...args),
			drawRect: (...args: Parameters<MarkInstance['drawRect']>) => instance.value?.drawRect(...args),
			removeRect: (...args: Parameters<MarkInstance['removeRect']>) => instance.value?.removeRect(...args),
			getInternalPage: (...args: Parameters<MarkInstance['getInternalPage']>) => instance.value?.getInternalPage(...args),
			setScaleByRadio: (...args: Parameters<MarkInstance['setScaleByRadio']>) => instance.value?.setScaleByRadio(...args),
			queryState: (...args: Parameters<MarkInstance['queryState']>) => instance.value?.queryState(...args),
			queryAllState: (...args: Parameters<MarkInstance['queryAllState']>) => instance.value?.queryAllState(...args),
			setActive: (...args: Parameters<MarkInstance['setActive']>) => instance.value?.setActive(...args),
			getActive: (...args: Parameters<MarkInstance['getActive']>) => instance.value?.getActive(...args),
		};
	},
});
</script>

<style>
.mark-container {
	position: relative;
	width: 100%;
	height: 100%;
	background-color: #fff;
}
</style>
