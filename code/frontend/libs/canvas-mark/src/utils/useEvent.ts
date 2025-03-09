import { Func } from '../types';
import { useShortcut } from './useShortcut';

export const useEvent = (node: HTMLElement) => {
	const { registerEvent, destroy } = useShortcut();

	const on = (event: string | string[], callback: Func) => {
		registerEvent(node, event, callback);
	};

	return { on, off: destroy };
};
