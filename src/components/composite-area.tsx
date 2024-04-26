import { useSDK } from "@captn/react/use-sdk";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";

import { drawingCanvasAtom, waveformCanvasAtom } from "@/atoms";
import { APP_ID } from "@/constants";

type CompositeParameters = {
	background?: string;
	canvas?: OffscreenCanvas | null;
	isRunning?: boolean;
};

export function CompositeArea({ background, isRunning }: CompositeParameters) {
	const canvas = useRef<HTMLCanvasElement>(null);

	const [drawingCanvas_] = useAtom(drawingCanvasAtom);
	const [waveformCanvas_] = useAtom(waveformCanvasAtom);

	const { send } = useSDK<unknown, string>(APP_ID, {});

	useEffect(() => {
		// Target for 60 FPS
		const targetFrameInterval = 1000 / 60;
		let lastRenderTime = Date.now();
		let animationFrameId: number;

		const canvasElement = canvas.current;
		if (!canvasElement) {
			return;
		}
		const dpr = Math.max(window.devicePixelRatio, 1);
		canvasElement.height = 512 * dpr;
		canvasElement.width = 512 * dpr;

		if (!waveformCanvas_ || !drawingCanvas_) {
			return;
		}

		const context = canvasElement.getContext("2d");

		if (!context) {
			return;
		}

		const offscreenCanvas = document.createElement("canvas");
		const scale = 0.125;
		offscreenCanvas.width = canvas.current.width * scale;
		offscreenCanvas.height = canvas.current.height * scale;

		const offscreenContext = offscreenCanvas.getContext("2d");

		if (!offscreenContext) {
			return;
		}

		offscreenContext.scale(scale, scale);
		context.scale(dpr, dpr);

		function renderLoop() {
			const now = Date.now();
			const elapsed = now - lastRenderTime;

			if (
				!context ||
				!canvasElement ||
				!drawingCanvas_ ||
				!offscreenContext ||
				!waveformCanvas_
			) {
				return;
			}

			if (elapsed > targetFrameInterval) {
				lastRenderTime = now - (elapsed % targetFrameInterval);

				// Clear the canvas
				context.clearRect(0, 0, canvasElement.width, canvasElement.height);

				// Create layers
				context.drawImage(waveformCanvas_, 0, 0);
				context.drawImage(drawingCanvas_, 0, 0);

				offscreenContext.fillStyle = "#000000";
				offscreenContext.rect(0, 0, canvasElement.width, canvasElement.height);
				offscreenContext.fill();

				offscreenContext.drawImage(canvasElement, 0, 0);

				if (isRunning) {
					// Send the composite canvas data to the backend
					offscreenCanvas.toBlob(
						async blob => {
							if (!blob) {
								return;
							}

							const arrayBuffer = await blob.arrayBuffer();
							const buffer = Buffer.from(arrayBuffer);

							send({
								action: "image-to-image:imageBuffer",
								payload: { appId: APP_ID, buffer },
							});
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
		};
	}, [drawingCanvas_, waveformCanvas_, send, isRunning]);

	return <canvas ref={canvas} style={{ pointerEvents: "none", background }} />;
}
