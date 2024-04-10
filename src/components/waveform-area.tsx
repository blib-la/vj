import { useAtom } from "jotai";
import type { SliceableArrayLike } from "meyda";
import { useEffect, useRef } from "react";

import { bufferAtom, rmsAtom, waveformCanvasAtom } from "@/atoms";

type WaveformPosition = {
	x: number;
	y: number;
	direction: "horizontal" | "vertical";
};

const positions: WaveformPosition[] = [
	{ x: 0, y: -10, direction: "horizontal" },
	{ x: 0, y: 0, direction: "horizontal" },
	{ x: 0, y: 10, direction: "horizontal" },
	{ x: -10, y: 0, direction: "vertical" },
	{ x: 0, y: 0, direction: "vertical" },
	{ x: 10, y: 0, direction: "vertical" },
];

/**
 * This hook must only be used once to prevent irrational canvas element creation
 * @param clearCounter
 */
export function useWaveformAnalyzer(clearCounter: number) {
	const bufferReference = useRef<SliceableArrayLike<number> | null>(null);
	const rmsReference = useRef(0);

	// TODO these should probably be passed as arguments
	const [buffer] = useAtom(bufferAtom);
	const [rms] = useAtom(rmsAtom);
	const [waveformCanvas, setWaveformCanvas] = useAtom(waveformCanvasAtom);

	useEffect(() => {
		// Target 60 FPS
		const canvasSize = 512;
		const targetFrameInterval = 1000 / 60;
		let lastRenderTime = Date.now();
		let animationFrame = -1;
		const offscreenCanvas = new OffscreenCanvas(canvasSize, canvasSize);
		const onscreenCanvas = new OffscreenCanvas(canvasSize, canvasSize);

		// Set the canvas so that it can be returned by this hook
		setWaveformCanvas(onscreenCanvas);

		// Set up device pixel ratio
		const dpr = Math.max(window.devicePixelRatio, 1);
		onscreenCanvas.width = 512 * dpr;
		onscreenCanvas.height = 512 * dpr;

		offscreenCanvas.width = 512 * dpr;
		offscreenCanvas.height = 512 * dpr;

		// Canvas contexts
		const offscreenContext = offscreenCanvas.getContext("2d");
		const context = onscreenCanvas.getContext("2d");

		if (context) {
			context.scale(dpr, dpr);
			context.globalAlpha = 0.25;
			context.globalCompositeOperation = "darken";
		}

		if (offscreenContext) {
			offscreenContext.scale(dpr, dpr);
		}

		function renderLoop() {
			const now = Date.now();
			const elapsed = now - lastRenderTime;
			const rmsThreshold = 0.095;
			const { width, height } = onscreenCanvas;

			// Early exit if either flag is triggered
			if (
				!context ||
				!offscreenContext ||
				!bufferReference.current ||
				rmsReference.current <= 0
			) {
				animationFrame = requestAnimationFrame(renderLoop);
				return;
			}

			// Only proceed if the elapsedTime is greater than our interval
			if (elapsed > targetFrameInterval) {
				lastRenderTime = now - (elapsed % targetFrameInterval);

				offscreenContext.drawImage(onscreenCanvas, 0, 0);

				// Clear the main canvas
				context.clearRect(0, 0, onscreenCanvas.width, onscreenCanvas.height);

				// Apply scaling and draw the content back from the offscreen canvas
				context.save();

				// Below 1 is downscale, above is upscale.
				// Force below 1 by setting 0.99
				const scaleFactor =
					0.99 + (rmsReference.current >= rmsThreshold ? rmsReference.current : 0) * 0.75;

				context.scale(scaleFactor, scaleFactor);
				const dx = (context.canvas.width - context.canvas.width * scaleFactor) / 2;
				const dy = (context.canvas.height - context.canvas.height * scaleFactor) / 2;

				context.drawImage(offscreenCanvas, dx, dy);

				context.restore();

				const hue = (rmsReference.current / 0.2) * 360;
				const hsl = `hsl(${hue}, 100%, 80%)`;

				for (const position of positions) {
					context.globalAlpha = rmsReference.current >= rmsThreshold ? 0.125 : 0.025;
					context.globalCompositeOperation = "source-over";
					context.fillStyle = "#000000";
					context.fillRect(0, 0, onscreenCanvas.width, onscreenCanvas.height);

					if (rmsReference.current >= rmsThreshold) {
						context.lineWidth = Math.max(50, 500 * rmsReference.current);

						context.strokeStyle = hsl;
					} else {
						context.lineWidth = 5;
						context.strokeStyle = "#ffffff";
					}

					context.globalAlpha = 1;
					const sliceWidth = width / bufferReference.current.length;
					const scaling = 1.75;

					// Handle either horizontal or vertical
					if (position.direction === "horizontal") {
						context.beginPath();
						context.moveTo(0, height / 2 + position.y);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const delta = bufferReference.current[index] * scaling;
							const y = width / 2 + (delta * width) / 2 + position.y;
							const x = sliceWidth * index + position.x;
							context.lineTo(x, y);
						}

						context.lineTo(width, height / 2 + position.y);
						context.stroke();
					} else {
						context.beginPath();
						context.moveTo(width / 2 + position.x, 0);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const delta = bufferReference.current[index] * scaling;
							const x = height / 2 + (delta * height) / 2 + position.x;
							const y = sliceWidth * index + position.y;
							context.lineTo(x, y);
						}

						context.lineTo(width / 2 + position.x, height);
						context.stroke();
					}
				}
			}
			animationFrame = requestAnimationFrame(renderLoop);
		}

		animationFrame = requestAnimationFrame(renderLoop);

		return () => {
			cancelAnimationFrame(animationFrame);
		};
	}, [setWaveformCanvas]);

	// Clear mechanism to clear the context when the clear button is clicked or a similar process changes the clearCounter value
	useEffect(() => {
		if (waveformCanvas) {
			const context = waveformCanvas.getContext("2d");
			if (context) {
				context.globalAlpha = 1;
				context.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
			}
		}
	}, [waveformCanvas, clearCounter]);

	// Mutation helpers
	useEffect(() => {
		bufferReference.current = buffer;
	}, [buffer]);

	useEffect(() => {
		rmsReference.current = rms;
	}, [rms]);

	return waveformCanvas;
}
