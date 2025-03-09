export const useGlobalActive = () => {
	let active: any = null;

	const getActive = () => active;

	const setActive = (newActive: any) => {
		active = newActive;
	};

	return {
		getActive,
		setActive,
	};
};
