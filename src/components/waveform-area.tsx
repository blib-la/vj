import Switch from "@mui/joy/Switch";
import { Typography } from "@mui/material";
import { useAtom } from "jotai";
import type { SliceableArrayLike } from "meyda";
import { useEffect, useRef, useState } from "react";

import { bufferAtom, clearCounterAtom, rmsAtom, waveformCanvasAtom } from "../atoms";

type WaveformPosition = {
	x: number;
	y: number;
	direction: "horizontal" | "vertical";
};

export function useWaveformAnalyzer() {
	const canvas = useRef<OffscreenCanvas | null>(null);
	const context = useRef<OffscreenCanvasRenderingContext2D | null>(null);
	const [buffer] = useAtom(bufferAtom);
	const [rms] = useAtom(rmsAtom);
	const [, setWaveformCanvas] = useAtom(waveformCanvasAtom);
	const bufferReference = useRef<SliceableArrayLike<number> | null>(null);
	const rmsReference = useRef<number | null>(null);
	const lastRenderTimeReference = useRef(Date.now());
	const targetFrameInterval = 1000 / 50;
	const [clearCounter] = useAtom(clearCounterAtom);
	const offscreenCanvasReference = useRef<OffscreenCanvas | null>(null);
	const offscreenContextReference = useRef<OffscreenCanvasRenderingContext2D | null>(null);

	useEffect(() => {
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

		context.current = canvasElement.getContext("2d");

		if (context && context.current) {
			context.current.scale(dpr, dpr);

			context.current.globalAlpha = 0.25;
			context.current.globalCompositeOperation = "darken";

			// Use the offscreen canvas for the waveform drawing
			setWaveformCanvas(canvasElement);
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
			offscreenContextReference.current = offscreenContext;
			offscreenCanvasReference.current = offscreenCanvas;
		}

		function renderLoop() {
			const now = Date.now();
			const elapsed = now - lastRenderTimeReference.current;
			const rmsThreshold = 0.095;

			if (
				elapsed > targetFrameInterval &&
				context.current &&
				bufferReference.current &&
				rmsReference.current &&
				offscreenContextReference.current
			) {
				lastRenderTimeReference.current = now - (elapsed % targetFrameInterval);

				const { width, height } = canvasElement;

				offscreenContextReference.current.drawImage(context.current.canvas, 0, 0);

				// Clear the main canvas
				context.current.clearRect(
					0,
					0,
					context.current.canvas.width,
					context.current.canvas.height
				);

				// Apply scaling and draw the content back from the offscreen canvas
				context.current.save();
				const scaleFactor =
					0.99 + (rmsReference.current >= rmsThreshold ? rmsReference.current : 0) * 0.75;

				context.current.scale(scaleFactor, scaleFactor);
				const dx =
					(context.current.canvas.width - context.current.canvas.width * scaleFactor) / 2;
				const dy =
					(context.current.canvas.height - context.current.canvas.height * scaleFactor) /
					2;

				if (offscreenCanvasReference) {
					context.current.drawImage(offscreenCanvasReference.current!, dx, dy);
				}

				context.current.restore();

				const hue = (rmsReference.current / 0.2) * 360;
				const saturation = 100;
				const hsl = `hsl(${hue}, ${saturation}%, 80%)`;

				for (const position of positions) {
					context.current.globalAlpha =
						rmsReference.current >= rmsThreshold ? 0.125 : 0.025;
					context.current.globalCompositeOperation =
						rmsReference.current >= rmsThreshold ? "source-over" : "source-over";
					context.current.fillStyle = "#000";
					context.current.fillRect(0, 0, canvasElement.width, canvasElement.height);

					//
					// context.current.globalCompositeOperation = isXorActive
					// 	? "xor"
					// 	: context.current.globalCompositeOperation;

					if (rmsReference.current >= rmsThreshold) {
						context.current.lineWidth = Math.max(50, 500 * rmsReference.current);

						context.current.strokeStyle = hsl;
					} else {
						context.current.lineWidth = 5;
						context.current.strokeStyle = "#fff";
					}

					context.current.globalAlpha = 1;
					const sliceWidth = width / bufferReference.current.length;
					const scaling = 1.75;

					// Horizontal
					if (position.direction === "horizontal") {
						context.current.beginPath();
						context.current.moveTo(0, height / 2 + position.y);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const v = bufferReference.current[index] * scaling;
							const y = width / 2 + (v * width) / 2 + position.y;
							const x = sliceWidth * index + position.x;
							context.current.lineTo(x, y);
						}

						context.current.lineTo(width, height / 2 + position.y);
						context.current.stroke();
					}
					// Vertical
					else if (position.direction === "vertical") {
						context.current.beginPath();
						context.current.moveTo(width / 2 + position.x, 0);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const v = bufferReference.current[index] * scaling;
							const x = height / 2 + (v * height) / 2 + position.x;
							const y = sliceWidth * index + position.y;
							context.current.lineTo(x, y);
						}

						context.current.lineTo(width / 2 + position.x, height);
						context.current.stroke();
					}
				}
			}

			animationFrame = requestAnimationFrame(renderLoop);
		}

		renderLoop();

		return () => {
			cancelAnimationFrame(animationFrame);
		};
	}, [setWaveformCanvas, targetFrameInterval]);

	useEffect(() => {
		bufferReference.current = buffer;
	}, [buffer]);

	useEffect(() => {
		rmsReference.current = rms;
	}, [rms]);

	useEffect(() => {
		if (context && context.current && canvas.current) {
			context.current.globalAlpha = 1;
			context.current.clearRect(0, 0, canvas.current.width, canvas.current.height);
		}
	}, [clearCounter]);
}

export function WaveformArea() {
	const canvas = useRef<OffscreenCanvas | null>(null);
	const context = useRef<OffscreenCanvasRenderingContext2D | null>(null);
	const [buffer] = useAtom(bufferAtom);
	const [rms] = useAtom(rmsAtom);
	const [, setWaveformCanvas] = useAtom(waveformCanvasAtom);
	const bufferReference = useRef<SliceableArrayLike<number> | null>(null);
	const rmsReference = useRef<number | null>(null);
	const lastRenderTimeReference = useRef(Date.now());
	const targetFrameInterval = 1000 / 50;
	const [clearCounter] = useAtom(clearCounterAtom);
	const [isXorActive, setIsXorActive] = useState(false);
	const [isScaleActive, setIsScaleActive] = useState(false);
	const offscreenCanvasReference = useRef<OffscreenCanvas | null>(null);
	const offscreenContextReference = useRef<OffscreenCanvasRenderingContext2D | null>(null);

	useEffect(() => {
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

		context.current = canvasElement.getContext("2d");

		if (context && context.current) {
			context.current.scale(dpr, dpr);

			context.current.globalAlpha = 0.25;
			context.current.globalCompositeOperation = "darken";

			// Use the offscreen canvas for the waveform drawing
			setWaveformCanvas(canvasElement);
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
			offscreenContextReference.current = offscreenContext;
			offscreenCanvasReference.current = offscreenCanvas;
		}

		function renderLoop() {
			const now = Date.now();
			const elapsed = now - lastRenderTimeReference.current;
			const rmsThreshold = 0.095;

			if (
				elapsed > targetFrameInterval &&
				context.current &&
				bufferReference.current &&
				rmsReference.current &&
				offscreenContextReference.current
			) {
				lastRenderTimeReference.current = now - (elapsed % targetFrameInterval);

				const { width, height } = canvasElement;

				offscreenContextReference.current.drawImage(context.current.canvas, 0, 0);

				// Clear the main canvas
				context.current.clearRect(
					0,
					0,
					context.current.canvas.width,
					context.current.canvas.height
				);

				// Apply scaling and draw the content back from the offscreen canvas
				context.current.save();
				const scaleFactor =
					0.99 + (rmsReference.current >= rmsThreshold ? rmsReference.current : 0) * 0.75;

				context.current.scale(scaleFactor, scaleFactor);
				const dx =
					(context.current.canvas.width - context.current.canvas.width * scaleFactor) / 2;
				const dy =
					(context.current.canvas.height - context.current.canvas.height * scaleFactor) /
					2;

				if (offscreenCanvasReference) {
					context.current.drawImage(offscreenCanvasReference.current!, dx, dy);
				}

				context.current.restore();

				const hue = (rmsReference.current / 0.2) * 360;
				const saturation = 100;
				const hsl = `hsl(${hue}, ${saturation}%, 80%)`;

				for (const position of positions) {
					context.current.globalAlpha =
						rmsReference.current >= rmsThreshold ? 0.125 : 0.025;
					context.current.globalCompositeOperation =
						rmsReference.current >= rmsThreshold ? "source-over" : "source-over";
					context.current.fillStyle = "#000";
					context.current.fillRect(0, 0, canvasElement.width, canvasElement.height);

					//
					// context.current.globalCompositeOperation = isXorActive
					// 	? "xor"
					// 	: context.current.globalCompositeOperation;

					if (rmsReference.current >= rmsThreshold) {
						context.current.lineWidth = Math.max(50, 500 * rmsReference.current);

						context.current.strokeStyle = hsl;
					} else {
						context.current.lineWidth = 5;
						context.current.strokeStyle = "#fff";
					}

					context.current.globalAlpha = 1;
					const sliceWidth = width / bufferReference.current.length;
					const scaling = 1.75;

					// Horizontal
					if (position.direction === "horizontal") {
						context.current.beginPath();
						context.current.moveTo(0, height / 2 + position.y);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const v = bufferReference.current[index] * scaling;
							const y = width / 2 + (v * width) / 2 + position.y;
							const x = sliceWidth * index + position.x;
							context.current.lineTo(x, y);
						}

						context.current.lineTo(width, height / 2 + position.y);
						context.current.stroke();
					}
					// Vertical
					else if (position.direction === "vertical") {
						context.current.beginPath();
						context.current.moveTo(width / 2 + position.x, 0);

						for (let index = 0; index < bufferReference.current.length; index++) {
							const v = bufferReference.current[index] * scaling;
							const x = height / 2 + (v * height) / 2 + position.x;
							const y = sliceWidth * index + position.y;
							context.current.lineTo(x, y);
						}

						context.current.lineTo(width / 2 + position.x, height);
						context.current.stroke();
					}
				}
			}

			animationFrame = requestAnimationFrame(renderLoop);
		}

		renderLoop();

		return () => {
			cancelAnimationFrame(animationFrame);
		};
	}, [isXorActive, setWaveformCanvas, targetFrameInterval]);

	useEffect(() => {
		bufferReference.current = buffer;
	}, [buffer]);

	useEffect(() => {
		rmsReference.current = rms;
	}, [rms]);

	useEffect(() => {
		if (context && context.current && canvas.current) {
			context.current.globalAlpha = 1;
			context.current.clearRect(0, 0, canvas.current.width, canvas.current.height);
		}
	}, [clearCounter]);

	return (
		<>
			<Typography>Waveforms</Typography>
			<Switch
				checked={isXorActive}
				startDecorator={<Typography>xor</Typography>}
				onChange={event => setIsXorActive(event.target.checked)}
			/>
			<Switch
				checked={isScaleActive}
				startDecorator={<Typography>scale down</Typography>}
				onChange={event => setIsScaleActive(event.target.checked)}
			/>
		</>
	);
}
