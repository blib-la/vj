import { useSDK } from "@captn/react/use-sdk";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";

import { drawingCanvasAtom, waveformCanvasAtom } from "../atoms";

import { APP_ID } from "@/constants";

type CompositeParameters = {
	background?: string;
	canvas: OffscreenCanvas | null;
};

export function CompositeArea({ background }: CompositeParameters) {
	const canvas = useRef<HTMLCanvasElement>(null);

	const [drawingCanvass] = useAtom(drawingCanvasAtom);
	const [waveformCanvass] = useAtom(waveformCanvasAtom);

	const { send } = useSDK<unknown, string>(APP_ID, {});

	useEffect(() => {
		console.log("composite.area");
		const canvasElement = canvas.current;

		//
		// function readerHandler() {
		// 	const arrayBuffer: ArrayBuffer = reader.result as ArrayBuffer;
		// 	const buffer = Buffer.from(arrayBuffer);

		// 	send({ action: "livePainting:imageBuffer", payload: buffer });
		// }

		// const reader = new FileReader();

		// reader.addEventListener("load", readerHandler);

		if (!canvasElement) {
			return;
		}

		const dpr = Math.max(window.devicePixelRatio, 1);
		canvasElement.height = 512 * dpr;
		canvasElement.width = 512 * dpr;
		const context = canvasElement.getContext("2d");

		const offscreenCanvas = document.createElement("canvas");
		const scale = 0.125;
		offscreenCanvas.width = canvas.current.width * scale;
		offscreenCanvas.height = canvas.current.height * scale;

		const offscreenContext = offscreenCanvas.getContext("2d");

		if (offscreenContext) {
			offscreenContext.scale(scale, scale);
		}

		if (!context) {
			return;
		}

		context.scale(dpr, dpr);

		const targetFrameInterval = 1000 / 50;
		let lastRenderTime = Date.now();

		let animationFrameId: number;

		function renderLoop() {
			const now = Date.now();
			const elapsed = now - lastRenderTime;

			if (elapsed > targetFrameInterval) {
				lastRenderTime = now - (elapsed % targetFrameInterval);

				if (!context || !canvasElement) {
					return;
				}

				// Clear the canvas
				context.clearRect(0, 0, canvasElement.width, canvasElement.height);

				if (drawingCanvass) {
					context.drawImage(drawingCanvass, 0, 0);
				}

				if (waveformCanvass) {
					context.drawImage(waveformCanvass, 0, 0);
				}

				if (offscreenContext) {
					offscreenContext.fillStyle = "#000";
					offscreenContext.rect(0, 0, canvasElement.width, canvasElement.height);
					offscreenContext.fill();

					offscreenContext.drawImage(canvas.current, 0, 0);

					// Send the composite canvas data to the backend
					offscreenCanvas.toBlob(
						async blob => {
							if (!blob) {
								return;
							}

							const arrayBuffer = await blob.arrayBuffer();
							const buffer = Buffer.from(arrayBuffer);

							send({
								action: "livePainting:imageBuffer",
								payload: { appId: APP_ID, buffer },
							});
							// Reader.readAsArrayBuffer(blob);
						},
						"image/jpeg",
						0.1
					);
				}
			}

			animationFrameId = requestAnimationFrame(renderLoop);
		}

		// Start the loop
		requestAnimationFrame(renderLoop);

		// Cleanup function to cancel the loop when the component unmounts or dependencies change
		return () => {
			cancelAnimationFrame(animationFrameId);
			// Reader.removeEventListener("load", readerHandler);
		};
	}, [drawingCanvass, waveformCanvass, send]);

	return <canvas ref={canvas} style={{ pointerEvents: "none", background }} />;
}
