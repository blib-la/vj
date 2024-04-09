import { useSDK } from "@captn/react/use-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

export function useUnload(appId: string, action: string, payload = appId) {
	const { send } = useSDK<unknown, string>(appId, {});
	useEffect(() => {
		function beforeUnload() {
			send({ action, payload });
		}

		window.addEventListener("beforeunload", beforeUnload);
		return () => {
			window.removeEventListener("beforeunload", beforeUnload);
		};
	}, [send, payload, action]);
}

export function useResettableState<T>(initialState: T, delay: number): [T, (value: T) => void] {
	const [state, setState] = useState<T>(initialState);
	const timer = useRef(-1);

	const setTemporaryState = useCallback(
		(value: T) => {
			setState(value);

			timer.current = window.setTimeout(() => {
				setState(initialState);
			}, delay);
		},
		[initialState, delay]
	);

	return [state, setTemporaryState];
}
