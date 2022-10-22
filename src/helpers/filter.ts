// Filter null and undefined values:
export const filterObject = <T>(obj: T): T =>
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	//@ts-expect-error
	Object.entries(obj).reduce((a, [k, v]) => (v == null ? a : ((a[k] = v), a)), {});
