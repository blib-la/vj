import { useAtom } from "jotai";
import type { SliceableArrayLike } from "meyda";
import { useEffect, useRef } from "react";

import { bufferAtom, rmsAtom } from "@/atoms";

type WaveformPosition = {
	x: number;
	y: number;
	direction: "horizontal" | "vertical";
};

export function useWaveformAnalyzer(clearCounter: number) {
	const canvas = useRef<OffscreenCanvas | null>(null);
	const bufferReference = useRef<SliceableArrayLike<number> | null>(null);
	const rmsReference = useRef<number | null>(null);

	const [buffer] = useAtom(bufferAtom);
	const [rms] = useAtom(rmsAtom);

	useEffect(() => {
		const targetFrameInterval = 1000 / 50;
		let lastRenderTime = Date.now();
		let animationFrame = -1;
		const offscreenCanvas = new OffscreenCanvas(512, 512);
		canvas.current = new OffscreenCanvas(512, 512);
		const canvasElement = canvas.current;

		const dpr = Math.max(window.devicePixelRatio, 1);
		canvasElement.width = 512 * dpr;
		canvasElement.height = 512 * dpr;

		offscreenCanvas.width = 512 * dpr;
		offscreenCanvas.height = 512 * dpr;
		const offscreenContext = offscreenCanvas.getContext("2d");

		const context = canvasElement.getContext("2d");

		if (context && context) {
			context.scale(dpr, dpr);

			context.globalAlpha = 0.25;
			context.globalCompositeOperation = "darken";
		}

		const positions: WaveformPosition[] = [
			{ x: 0, y: -10, direction: "horizontal" },
			{ x: 0, y: 0, direction: "horizontal" },
			{ x: 0, y: 10, direction: "horizontal" },
			{ x: -10, y: 0, direction: "vertical" },
			{ x: 0, y: 0, direction: "vertical" },
			{ x: 10, y: 0, direction: "vertical" },
		];

		if (offscreenContext) {
			offscreenContext.scale(dpr, dpr);
		}

		function renderLoop() {
			const now = Date.now();
			const elapsed = now - lastRenderTime;
			const rmsThreshold = 0.095;

			if (
				elapsed > targetFrameInterval &&
				context &&
				bufferReference.current &&
				rmsReference.current &&
				offscreenContext
			) {
				lastRenderTime = now - (elapsed % targetFrameInterval);

				const { width, height } = canvasElement;

				offscreenContext.drawImage(context.canvas, 0, 0);

				// Clear the main canvas
				context.clearRect(0, 0, context.canvas.width, context.canvas.height);

				// Apply scaling and draw the content back from the offscreen canvas
				context.save();
				const scaleFactor =
					0.99 + (rmsReference.current >= rmsThreshold ? rmsReference.current : 0) * 0.75;

				context.scale(scaleFactor, scaleFactor);
				const dx = (context.canvas.width - context.canvas.width * scaleFactor) / 2;
				const dy = (context.canvas.height - context.canvas.height * scaleFactor) / 2;

				context.drawImage(offscreenCanvas, dx, dy);

				context.restore();

				const hue = (rmsReference.current / 0.2) * 360;
				const saturation = 100;
				const hsl = `hsl(${hue}, ${saturation}%, 80%)`;

				for (const position of positions) {
					context.globalAlpha = rmsReference.current >= rmsThreshold ? 0.125 : 0.025;
					context.globalCompositeOperation =
						rmsReference.current >= rmsThreshold ? "source-over" : "source-over";
					context.fillStyle = "#000";
					context.fillRect(0, 0, canvasElement.width, canvasElement.height);

					//
					// context.globalCompositeOperation = isXorActive
					// 	? "xor"
					// 	: context.globalCompositeOperation;

					if (rmsReference.current >= rmsThreshold) {
						context.lineWidth = Math.max(50, 500 * rmsReference.current);

						context.strokeStyle = hsl;
					} else {
						context.lineWidth = 5;
						context.strokeStyle = "#fff";
					}

					context.globalAlpha = 1;
					const sliceWidth = width / bufferReference.current.length;
					const scaling = 1.75;

					// Horizontal
					if (position.direction === "horizontal") {
						context.beginPath();
						context.moveTo(0, height / 2 + position.y);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const v = bufferReference.current[index] * scaling;
							const y = width / 2 + (v * width) / 2 + position.y;
							const x = sliceWidth * index + position.x;
							context.lineTo(x, y);
						}

						context.lineTo(width, height / 2 + position.y);
						context.stroke();
					}
					// Vertical
					else if (position.direction === "vertical") {
						context.beginPath();
						context.moveTo(width / 2 + position.x, 0);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const v = bufferReference.current[index] * scaling;
							const x = height / 2 + (v * height) / 2 + position.x;
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

		renderLoop();

		return () => {
			cancelAnimationFrame(animationFrame);
		};
	}, []);

	useEffect(() => {
		bufferReference.current = buffer;
	}, [buffer]);

	useEffect(() => {
		rmsReference.current = rms;
	}, [rms]);

	useEffect(() => {
		if (canvas.current) {
			const context = canvas.current.getContext("2d");
			if (context) {
				context.globalAlpha = 1;
				context.clearRect(0, 0, canvas.current.width, canvas.current.height);
			}
		}
	}, [clearCounter]);

	return canvas.current;
}
